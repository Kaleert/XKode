/* android/app/src/main/java/pro/kaleert/XKode/managers/FileSystemManager.java */

package pro.kaleert.XKode.managers;

import android.os.Environment;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import com.jcraft.jsch.SftpATTRS;

import org.apache.commons.net.ftp.FTP;
import org.apache.commons.net.ftp.FTPClient;
import org.apache.commons.net.ftp.FTPFile;
import org.apache.commons.net.ftp.FTPReply;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.Vector;

public class FileSystemManager {

    // --- LOCAL FS ---
    public static WritableArray listLocal(String path) throws Exception {
        File dir = (path == null || path.equals("/") || path.isEmpty()) 
            ? Environment.getExternalStorageDirectory() 
            : new File(path);

        if (!dir.exists()) throw new Exception("Path does not exist: " + path);
        
        File[] files = dir.listFiles();
        WritableArray list = Arguments.createArray();
        
        if (files != null) {
            for (File f : files) {
                WritableMap map = Arguments.createMap();
                map.putString("name", f.getName());
                map.putString("path", f.getAbsolutePath());
                map.putBoolean("isDirectory", f.isDirectory());
                list.pushMap(map);
            }
        }
        return list;
    }

    public static String readLocal(String path) throws Exception {
        File f = new File(path);
        
        // 1. Проверки существования
        if (!f.exists()) {
            throw new Exception("READ_ERR: File does not exist: " + path);
        }
        if (f.isDirectory()) {
            throw new Exception("READ_ERR: Cannot read directory as file: " + path);
        }
        if (!f.canRead()) {
            throw new Exception("READ_ERR: Access denied (OS permission): " + path);
        }
        
        // 2. Проверка размера (чтобы не убить JS память)
        long size = f.length();
        if (size > 10 * 1024 * 1024) { // 10 MB limit
            throw new Exception("READ_ERR: File too large (" + (size/1024) + " KB). Limit is 10MB.");
        }

        // 3. Чтение
        try (FileInputStream fis = new FileInputStream(f)) {
            byte[] data = new byte[(int) size];
            int bytesRead = fis.read(data);
            
            if (bytesRead == -1 && size > 0) {
                 throw new Exception("READ_ERR: Failed to read bytes (EOF)");
            }
            
            int checkLimit = Math.min(data.length, 512);
            for (int i = 0; i < checkLimit; i++) {
                if (data[i] == 0) {
                    throw new Exception("READ_ERR: Detected binary file (contains null bytes)");
                }
            }

            return new String(data, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new Exception("READ_ERR: IO Exception: " + e.getMessage());
        }
    }

    public static void saveLocal(String path, String content) throws Exception {
        try (FileOutputStream fos = new FileOutputStream(path)) {
            fos.write(content.getBytes(StandardCharsets.UTF_8));
        }
    }

    // --- SFTP ---
    public static WritableArray listSftp(String host, int port, String user, String pass, String path) throws Exception {
        JSch jsch = new JSch();
        Session session = null;
        ChannelSftp channel = null;

        try {
            session = jsch.getSession(user, host, port);
            session.setPassword(pass);
            
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            // Разрешаем все популярные методы, чтобы не было ошибок "Auth fail"
            config.put("PreferredAuthentications", "password,keyboard-interactive,publickey");
            session.setConfig(config);
            
            // Таймаут подключения 10 секунд
            session.connect(10000); 

            channel = (ChannelSftp) session.openChannel("sftp");
            channel.connect();

            // Корректировка пути (если пришел null или пустой, берем корень или домашнюю папку)
            String targetPath = (path == null || path.isEmpty()) ? "." : path;

            Vector<ChannelSftp.LsEntry> list = channel.ls(targetPath);
            WritableArray result = Arguments.createArray();

            for (ChannelSftp.LsEntry entry : list) {
                String name = entry.getFilename();
                // Пропускаем ссылки на текущую и родительскую папки
                if (name.equals(".") || name.equals("..")) continue;

                WritableMap map = Arguments.createMap();
                map.putString("name", name);
                
                // Формируем полный путь для навигации
                // Если targetPath ".", то путь просто имя файла, иначе путь/имя
                String fullPath;
                if (targetPath.equals(".")) {
                    fullPath = name; 
                } else if (targetPath.endsWith("/")) {
                    fullPath = targetPath + name;
                } else {
                    fullPath = targetPath + "/" + name;
                }
                
                map.putString("path", fullPath);
                map.putBoolean("isDirectory", entry.getAttrs().isDir());
                
                // Можно добавить размер и права, если нужно
                // map.putDouble("size", entry.getAttrs().getSize());
                
                result.pushMap(map);
            }
            
            return result;

        } catch (com.jcraft.jsch.JSchException e) {
            String msg = e.getMessage();
            // Детальная обработка ошибок для пользователя
            if (msg.contains("Auth fail")) {
                throw new Exception("Auth Failed: Check username/password.");
            } else if (msg.contains("reject HostKey")) {
                throw new Exception("Security Error: Host key rejected.");
            } else if (msg.contains("timeout")) {
                throw new Exception("Connection Timeout: Server is not responding.");
            } else {
                throw new Exception("SSH Error: " + msg);
            }
        } catch (Exception e) {
            throw new Exception("SFTP Error: " + e.getMessage());
        } finally {
            if (channel != null && channel.isConnected()) channel.disconnect();
            if (session != null && session.isConnected()) session.disconnect();
        }
    }

    // --- FTP ---
    public static WritableArray listFtp(String host, int port, String user, String pass, String path) throws Exception {
        FTPClient ftp = new FTPClient();
        try {
            ftp.setConnectTimeout(5000);
            ftp.connect(host, port);
            
            if (!FTPReply.isPositiveCompletion(ftp.getReplyCode())) {
                ftp.disconnect();
                throw new Exception("FTP server refused connection.");
            }

            if (!ftp.login(user, pass)) {
                ftp.disconnect();
                throw new Exception("FTP login failed.");
            }

            // Важно для мобильных сетей и NAT
            ftp.enterLocalPassiveMode();
            ftp.setFileType(FTP.BINARY_FILE_TYPE);

            String target = (path == null || path.isEmpty()) ? "/" : path;
            
            FTPFile[] files = ftp.listFiles(target);
            WritableArray result = Arguments.createArray();

            for (FTPFile file : files) {
                String name = file.getName();
                if (name.equals(".") || name.equals("..")) continue;

                WritableMap map = Arguments.createMap();
                map.putString("name", name);
                String fullPath = target.endsWith("/") ? target + name : target + "/" + name;
                map.putString("path", fullPath);
                map.putBoolean("isDirectory", file.isDirectory());
                result.pushMap(map);
            }
            
            return result;
        } finally {
            if (ftp.isConnected()) {
                try { ftp.disconnect(); } catch (Exception ignored) {}
            }
        }
    }
    
    public static String readSftp(String host, int port, String user, String pass, String path) throws Exception {
        JSch jsch = new JSch();
        Session session = null;
        ChannelSftp channel = null;
        InputStream stream = null;

        try {
            session = jsch.getSession(user, host, port);
            session.setPassword(pass);
            Properties config = new Properties();
            config.put("StrictHostKeyChecking", "no");
            config.put("PreferredAuthentications", "password,keyboard-interactive,publickey");
            session.setConfig(config);
            session.connect(10000);

            channel = (ChannelSftp) session.openChannel("sftp");
            channel.connect();

            // 1. Проверяем файл перед скачиванием
            try {
                SftpATTRS attrs = channel.lstat(path);
                if (attrs.isDir()) {
                    throw new Exception("Cannot open directory as file");
                }
                long size = attrs.getSize();
                if (size > 5 * 1024 * 1024) { // Лимит 5 МБ для удаленных файлов
                    throw new Exception("File too large for remote editing (>5MB)");
                }
            } catch (Exception e) {
                // Если lstat не сработал, возможно файл не существует или нет прав
                throw new Exception("Remote file check failed: " + e.getMessage());
            }

            // 2. Читаем поток
            stream = channel.get(path);
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            int nRead;
            byte[] data = new byte[4096];

            while ((nRead = stream.read(data, 0, data.length)) != -1) {
                buffer.write(data, 0, nRead);
            }
            
            buffer.flush();
            byte[] fileBytes = buffer.toByteArray();

            // 3. Простейшая проверка на бинарность (первые 512 байт)
            int checkLimit = Math.min(fileBytes.length, 512);
            for (int i = 0; i < checkLimit; i++) {
                if (fileBytes[i] == 0) throw new Exception("Detected binary file");
            }

            return new String(fileBytes, StandardCharsets.UTF_8);

        } catch (com.jcraft.jsch.JSchException e) {
            throw new Exception("SFTP Conn Error: " + e.getMessage());
        } catch (com.jcraft.jsch.SftpException e) {
            throw new Exception("SFTP Read Error: " + e.getMessage());
        } finally {
            if (stream != null) try { stream.close(); } catch (IOException e) {}
            if (channel != null) channel.disconnect();
            if (session != null) session.disconnect();
        }
    }
}