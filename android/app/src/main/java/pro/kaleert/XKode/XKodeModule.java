package pro.kaleert.XKode;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.os.Environment;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

import pro.kaleert.XKode.managers.FileSystemManager;
import pro.kaleert.XKode.managers.TerminalManager;

import java.io.File;
import java.io.FileOutputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

public class XKodeModule extends ReactContextBaseJavaModule {

    private final TerminalManager terminalManager;
    private final ReactApplicationContext reactContext; // <--- ВАЖНО: Объявляем переменную

    public XKodeModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context; // <--- ВАЖНО: Присваиваем значение
        this.terminalManager = TerminalManager.getInstance(context);
    }

    @Override
    public String getName() {
        return "XKodeNative";
    }

    // --- PERMISSIONS ---

    @ReactMethod
    public void checkPermission(Promise promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            promise.resolve(Environment.isExternalStorageManager());
        } else {
            promise.resolve(true);
        }
    }

    @ReactMethod
    public void requestPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.addCategory("android.intent.category.DEFAULT");
                intent.setData(Uri.parse(String.format("package:%s", reactContext.getPackageName())));
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    activity.startActivityForResult(intent, 123);
                }
            } catch (Exception e) {
                Intent intent = new Intent();
                intent.setAction(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                Activity activity = getCurrentActivity();
                if (activity != null) {
                    activity.startActivityForResult(intent, 123);
                }
            }
        }
    }

    // --- FS EXTENSIONS ---

    @ReactMethod
    public void createDir(String path, Promise promise) {
        try {
            File dir = new File(path);
            if (!dir.exists()) {
                boolean created = dir.mkdirs();
                promise.resolve(created ? "Created" : "Exists");
            } else {
                promise.resolve("Exists");
            }
        } catch (Exception e) {
            promise.reject("FS_ERR", e.getMessage());
        }
    }

    @ReactMethod
    public void appendFile(String path, String content, Promise promise) {
        new Thread(() -> {
            try {
                File f = new File(path);
                if (f.getParentFile() != null) f.getParentFile().mkdirs();
                try (FileOutputStream fos = new FileOutputStream(f, true)) {
                    fos.write(content.getBytes());
                }
                promise.resolve("Appended");
            } catch (Exception e) {
                promise.reject("FS_ERR", e.getMessage());
            }
        }).start();
    }

    @ReactMethod
    public void zipFolder(String sourcePath, String destPath, Promise promise) {
        new Thread(() -> {
            try {
                FileOutputStream fos = new FileOutputStream(destPath);
                ZipOutputStream zipOut = new ZipOutputStream(fos);
                File fileToZip = new File(sourcePath);
                zipFile(fileToZip, fileToZip.getName(), zipOut);
                zipOut.close();
                fos.close();
                promise.resolve(destPath);
            } catch (Exception e) {
                promise.reject("ZIP_ERR", e.getMessage());
            }
        }).start();
    }

    private void zipFile(File fileToZip, String fileName, ZipOutputStream zipOut) throws IOException {
        if (fileToZip.isHidden()) return;
        if (fileToZip.isDirectory()) {
            if (fileName.endsWith("/")) {
                zipOut.putNextEntry(new ZipEntry(fileName));
                zipOut.closeEntry();
            } else {
                zipOut.putNextEntry(new ZipEntry(fileName + "/"));
                zipOut.closeEntry();
            }
            File[] children = fileToZip.listFiles();
            if (children != null) {
                for (File childFile : children) {
                    zipFile(childFile, fileName + "/" + childFile.getName(), zipOut);
                }
            }
            return;
        }
        FileInputStream fis = new FileInputStream(fileToZip);
        ZipEntry zipEntry = new ZipEntry(fileName);
        zipOut.putNextEntry(zipEntry);
        byte[] bytes = new byte[1024];
        int length;
        while ((length = fis.read(bytes)) >= 0) {
            zipOut.write(bytes, 0, length);
        }
        fis.close();
    }

    // --- WRAPPERS ---

    @ReactMethod
    public void listLocalFiles(String path, Promise promise) {
        new Thread(() -> {
            try { promise.resolve(FileSystemManager.listLocal(path)); }
            catch (Exception e) { promise.reject("FS_ERR", e.getMessage()); }
        }).start();
    }

    @ReactMethod
    public void readLocalFile(String path, Promise promise) {
        new Thread(() -> {
            try { promise.resolve(FileSystemManager.readLocal(path)); }
            catch (Exception e) { promise.reject("FS_ERR", e.getMessage()); }
        }).start();
    }

    @ReactMethod
    public void saveLocalFile(String path, String content, Promise promise) {
        new Thread(() -> {
            try { FileSystemManager.saveLocal(path, content); promise.resolve("Saved"); }
            catch (Exception e) { promise.reject("FS_ERR", e.getMessage()); }
        }).start();
    }

    @ReactMethod
    public void listSftpFiles(String h, int p, String u, String pw, String path, Promise promise) {
        new Thread(() -> {
            try { promise.resolve(FileSystemManager.listSftp(h, p, u, pw, path)); }
            catch (Exception e) { promise.reject("SFTP_ERR", e.getMessage()); }
        }).start();
    }

    @ReactMethod
    public void listFtpFiles(String h, int p, String u, String pw, String path, Promise promise) {
        new Thread(() -> {
            try { promise.resolve(FileSystemManager.listFtp(h, p, u, pw, path)); }
            catch (Exception e) { promise.reject("FTP_ERR", e.getMessage()); }
        }).start();
    }

    @ReactMethod
    public void startSshSession(String id, String h, int p, String u, String pw) {
        terminalManager.startSsh(id, h, p, u, pw);
    }

    @ReactMethod
    public void startLocalSession(String id) {
        terminalManager.startLocal(id);
    }

    @ReactMethod
    public void writeToSession(String id, String d) {
        terminalManager.write(id, d);
    }

    @ReactMethod
    public void closeSession(String id) {
        terminalManager.close(id);
    }
    
    @ReactMethod
    public void readSftpFile(String h, int p, String u, String pw, String path, Promise promise) {
        new Thread(() -> {
            try { 
                String content = FileSystemManager.readSftp(h, p, u, pw, path);
                promise.resolve(content); 
            } catch (Exception e) { 
                promise.reject("SFTP_READ_ERR", e.getMessage()); 
            }
        }).start();
    }
}