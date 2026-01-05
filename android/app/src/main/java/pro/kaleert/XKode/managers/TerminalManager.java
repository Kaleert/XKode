/* android/app/src/main/java/pro/kaleert/XKode/managers/TerminalManager.java */

package pro.kaleert.XKode.managers;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Properties;
import java.util.concurrent.ConcurrentHashMap;

public class TerminalManager {
    
    private static TerminalManager instance;
    private final ReactApplicationContext reactContext;
    private final Map<String, TerminalSession> sessions = new ConcurrentHashMap<>();

    private TerminalManager(ReactApplicationContext context) {
        this.reactContext = context;
    }

    public static synchronized TerminalManager getInstance(ReactApplicationContext context) {
        if (instance == null) {
            instance = new TerminalManager(context);
        }
        return instance;
    }

    // Внутренний класс для хранения состояния одной сессии
    private static class TerminalSession {
        String id;
        Session jschSession;
        ChannelShell channel;
        Process localProcess;
        InputStream in;
        OutputStream out;
        Thread reader;
        boolean isRunning = true;
    }

    // SSH Connect
    public void startSsh(String id, String host, int port, String user, String pass) {
        new Thread(() -> {
            TerminalSession session = new TerminalSession();
            session.id = id;
            try {
                JSch jsch = new JSch();
                Session s = jsch.getSession(user, host, port);
                s.setPassword(pass);
                Properties config = new Properties();
                config.put("StrictHostKeyChecking", "no");
                s.setConfig(config);
                s.connect(10000);

                ChannelShell ch = (ChannelShell) s.openChannel("shell");
                ch.setPty(true);
                ch.connect();

                session.jschSession = s;
                session.channel = ch;
                session.in = ch.getInputStream();
                session.out = ch.getOutputStream();

                sessions.put(id, session);
                emitData(id, "Connected to " + host + "\r\n");
                startReader(session);

            } catch (Exception e) {
                emitData(id, "SSH Error: " + e.getMessage() + "\r\n");
            }
        }).start();
    }

    // Local Shell
    public void startLocal(String id) {
        new Thread(() -> {
            TerminalSession session = new TerminalSession();
            session.id = id;
            try {
                // Пытаемся запустить шелл. В обычном андроиде это ограничено,
                // но базовые команды (ls, cd) сработают, если путь к sh верный.
                ProcessBuilder pb = new ProcessBuilder("/system/bin/sh");
                pb.redirectErrorStream(true);
                Map<String, String> env = pb.environment();
                env.put("TERM", "xterm-256color");
                
                Process p = pb.start();
                session.localProcess = p;
                session.in = p.getInputStream();
                session.out = p.getOutputStream();

                sessions.put(id, session);
                emitData(id, "Local Shell Started\r\n");
                startReader(session);

            } catch (Exception e) {
                emitData(id, "Local Shell Error: " + e.getMessage() + "\r\n");
            }
        }).start();
    }

    // Write Data
    public void write(String id, String data) {
        TerminalSession s = sessions.get(id);
        if (s != null && s.out != null) {
            new Thread(() -> {
                try {
                    s.out.write(data.getBytes(StandardCharsets.UTF_8));
                    s.out.flush();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    // Close
    public void close(String id) {
        TerminalSession s = sessions.get(id);
        if (s != null) {
            s.isRunning = false;
            try {
                if (s.channel != null) s.channel.disconnect();
                if (s.jschSession != null) s.jschSession.disconnect();
                if (s.localProcess != null) s.localProcess.destroy();
            } catch (Exception ignored) {}
            sessions.remove(id);
        }
    }

    // Reader Thread
    private void startReader(TerminalSession s) {
        s.reader = new Thread(() -> {
            byte[] buf = new byte[4096];
            int len;
            try {
                while (s.isRunning && (len = s.in.read(buf)) != -1) {
                    String text = new String(buf, 0, len, StandardCharsets.UTF_8);
                    emitData(s.id, text);
                }
            } catch (Exception e) {
                // Socket closed
            }
            emitData(s.id, "\r\n[Session Closed]\r\n");
            close(s.id);
        });
        s.reader.start();
    }

    // Event Emitter
    private void emitData(String id, String data) {
        if (reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("sessionId", id);
            params.putString("data", data);
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("TERMINAL_OUTPUT", params);
        }
    }
}