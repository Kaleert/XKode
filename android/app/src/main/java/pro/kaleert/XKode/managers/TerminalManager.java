package pro.kaleert.XKode.managers;

import android.os.Handler;
import android.os.Looper;

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

// Импортируем наш нативный компонент
import pro.kaleert.XKode.views.ConsoleView;

public class TerminalManager {
    
    private static TerminalManager instance;
    private final ReactApplicationContext reactContext;
    
    // Хранение сессий SSH
    private final Map<String, TerminalSession> sessions = new ConcurrentHashMap<>();
    
    // Хранение активных UI-компонентов (чтобы писать в них напрямую)
    private final Map<String, ConsoleView> activeViews = new ConcurrentHashMap<>();

    private TerminalManager(ReactApplicationContext context) {
        this.reactContext = context;
    }

    public static synchronized TerminalManager getInstance(ReactApplicationContext context) {
        if (instance == null) {
            instance = new TerminalManager(context);
        }
        return instance;
    }

    // --- VIEW REGISTRATION ---

    public void registerView(String id, ConsoleView view) {
        activeViews.put(id, view);
        // Если бы у нас был буфер истории, мы могли бы его здесь восстановить
    }

    public void unregisterView(String id) {
        activeViews.remove(id);
    }

    // --- SESSION CLASS ---

    private static class TerminalSession {
        String id;
        Session jschSession;
        ChannelShell channel;
        InputStream in;
        OutputStream out;
        Thread reader;
        boolean isRunning = true;
    }

    // --- SSH MANAGEMENT ---

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
                // Оптимизация для скорости
                config.put("PreferredAuthentications", "password,keyboard-interactive,publickey");
                config.put("compression.s2c", "zlib,none"); 
                config.put("compression.c2s", "zlib,none");
                
                s.setConfig(config);
                s.connect(10000);

                ChannelShell ch = (ChannelShell) s.openChannel("shell");
                // PTY Type: xterm для поддержки цветов и курсора
                ch.setPtyType("xterm"); 
                ch.setPty(true);
                ch.connect();

                session.jschSession = s;
                session.channel = ch;
                session.in = ch.getInputStream();
                session.out = ch.getOutputStream();

                sessions.put(id, session);
                
                // Приветственное сообщение
                emitData(id, "Connected to " + host + " (XKode Native)\r\n");
                
                startReader(session);

            } catch (Exception e) {
                emitData(id, "SSH Connection Error: " + e.getMessage() + "\r\n");
            }
        }).start();
    }

    // Local Shell удален по запросу

    // --- INPUT/OUTPUT ---

    public void write(String id, String data) {
        TerminalSession s = sessions.get(id);
        if (s != null && s.out != null) {
            new Thread(() -> {
                try {
                    // Важно: пишем байты UTF-8, чтобы работала кириллица
                    s.out.write(data.getBytes(StandardCharsets.UTF_8));
                    s.out.flush();
                } catch (IOException e) {
                    e.printStackTrace();
                }
            }).start();
        }
    }

    public void close(String id) {
        TerminalSession s = sessions.get(id);
        if (s != null) {
            s.isRunning = false;
            try {
                if (s.channel != null) s.channel.disconnect();
                if (s.jschSession != null) s.jschSession.disconnect();
            } catch (Exception ignored) {}
            sessions.remove(id);
            activeViews.remove(id); // Удаляем ссылку на View
        }
    }

    private void startReader(TerminalSession s) {
        s.reader = new Thread(() -> {
            byte[] buf = new byte[8192]; // Буфер побольше
            int len;
            try {
                while (s.isRunning && (len = s.in.read(buf)) != -1) {
                    // Читаем сырые данные
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

    // --- DATA DISPATCHER ---

    private void emitData(String id, String data) {
        ConsoleView view = activeViews.get(id);
        if (view != null) {
            new Handler(Looper.getMainLooper()).post(() -> {
                try {
                    view.appendText(data);
                } catch (Exception e) {
                    // Игнорируем ошибки UI обновлений если view умерла
                }
            });
        }

        if (reactContext != null && reactContext.hasActiveCatalystInstance()) {
            WritableMap params = Arguments.createMap();
            params.putString("sessionId", id);
            params.putString("data", data);
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit("TERMINAL_OUTPUT", params);
        }
    }
}