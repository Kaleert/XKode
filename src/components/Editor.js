/* src/components/Editor.js */
import React, { forwardRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

const Editor = forwardRef(({ initialCode, path, onSave }, ref) => {
  
  useEffect(() => {
    if (ref.current) {
        const safeCode = typeof initialCode === 'string' ? initialCode : '';
        // Небольшая задержка для гарантии загрузки WebView
        setTimeout(() => {
            const payload = JSON.stringify({ type: 'setCode', content: safeCode, path: path });
            ref.current.postMessage(payload);
        }, 100);
    }
  }, [initialCode, path]);

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body { margin: 0; padding: 0; overflow: hidden; background-color: #1e1e1e; }
        #container { width: 100vw; height: 100vh; }
        /* Умеренный отступ снизу */
        .monaco-editor .lines-content { padding-bottom: 300px !important; }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
</head>
<body>
    <div id="container"></div>
    <script>
        require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
        require(['vs/editor/editor.main'], function() {
            window.editor = monaco.editor.create(document.getElementById('container'), {
                value: "",
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                lineNumbersMinChars: 3, // Компактные номера
                glyphMargin: false, // Убираем отступ слева
                folding: true,
                scrollBeyondLastLine: false,
                wordWrap: 'off', // Выключаем перенос строк по требованию
                scrollbar: {
                    verticalScrollbarSize: 10,
                    horizontalScrollbarSize: 10
                }
            });

            document.addEventListener("message", function(event) {
                try {
                    var data = JSON.parse(event.data);
                    if (data.type === 'setCode') {
                         var ext = data.path ? data.path.split('.').pop() : 'js';
                         var lang = 'javascript';
                         if(ext === 'html') lang = 'html';
                         if(ext === 'css') lang = 'css';
                         if(ext === 'json') lang = 'json';
                         if(ext === 'py') lang = 'python';
                         if(ext === 'java') lang = 'java';
                         if(ext === 'cpp') lang = 'cpp';
                         
                         var model = window.editor.getModel();
                         monaco.editor.setModelLanguage(model, lang);
                         window.editor.setValue(data.content);
                    }
                } catch(e) {}
            });
        });

        window.requestSave = function() {
            if(window.editor) window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'save', content: window.editor.getValue() }));
        };
        
        window.insertText = function(text) {
            if (window.editor) {
                var selection = window.editor.getSelection();
                var op = {identifier: {major:1, minor:1}, range: selection, text: text, forceMoveMarkers: true};
                window.editor.executeEdits("my-source", [op]);
                window.editor.focus();
            }
        };
    </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      <WebView
        ref={ref}
        originWhitelist={['*']}
        source={{ html: htmlContent }}
        style={{ flex: 1, backgroundColor: '#1e1e1e' }}
        onMessage={(e) => {
            try {
                const data = JSON.parse(e.nativeEvent.data);
                if (data.type === 'save') onSave(data.content);
            } catch(err){}
        }}
        androidLayerType="hardware"
        hideKeyboardAccessoryView={true}
      />
    </View>
  );
});

const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#1e1e1e' } });
export default Editor;