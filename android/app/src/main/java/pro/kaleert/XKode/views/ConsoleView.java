package pro.kaleert.XKode.views;

import android.content.Context;
import android.graphics.Color;
import android.graphics.Typeface;
import android.text.InputType;
import android.text.SpannableStringBuilder;
import android.util.AttributeSet;
import android.view.KeyEvent;
import android.view.inputmethod.EditorInfo;
import android.view.inputmethod.InputConnection;
import android.view.inputmethod.InputConnectionWrapper;
import androidx.appcompat.widget.AppCompatEditText;

import pro.kaleert.XKode.managers.TerminalManager;

public class ConsoleView extends AppCompatEditText {

    private String sessionId;

    public ConsoleView(Context context) {
        super(context);
        init();
    }

    public ConsoleView(Context context, AttributeSet attrs) {
        super(context, attrs);
        init();
    }

    private void init() {
        // СТИЛИЗАЦИЯ
        this.setBackgroundColor(Color.parseColor("#1e1e1e"));
        this.setTextColor(Color.parseColor("#cccccc"));
        this.setTextSize(12); // Меньше шрифт, как просил
        this.setTypeface(Typeface.MONOSPACE);
        
        // КУРСОР И ВВОД
        this.setCursorVisible(true);
        // Важно: Отключаем предложения, автокоррекцию и ставим мультилайн
        this.setInputType(InputType.TYPE_CLASS_TEXT | 
                          InputType.TYPE_TEXT_FLAG_MULTI_LINE | 
                          InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS | 
                          InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD); // "Password" трюк убирает полосу подсказок
        
        // Кнопка Enter вместо галочки
        this.setImeOptions(EditorInfo.IME_FLAG_NO_ENTER_ACTION);
        
        // Блокируем стандартное изменение текста (мы будем менять его программно из SSH)
        // Но оставляем возможность ввода
        this.setTextIsSelectable(true);
        this.setFocusable(true);
        this.setFocusableInTouchMode(true);
    }

    public void setSessionId(String id) {
        this.sessionId = id;
        // Подписываемся на вывод терминала
        TerminalManager.getInstance(null).registerView(id, this);
    }

    public void appendText(String text) {
        // Удаляем ANSI-коды (цвета), чтобы не было мусора [32m...
        // Для полноценных цветов нужна библиотека типа Termux Terminal View, 
        // но для начала сделаем чистый текст.
        String cleanText = text.replaceAll("\u001B\\[[;\\d]*m", "");
        
        // Работаем в UI потоке
        post(() -> {
            // Умный автоскролл: если курсор был в конце, скроллим
            boolean isAtBottom = (getSelectionStart() == length());
            
            getText().append(cleanText);
            
            if (isAtBottom) {
                setSelection(length());
            }
        });
    }

    // ПЕРЕХВАТ ВВОДА (Отправка в SSH)
    @Override
    public InputConnection onCreateInputConnection(EditorInfo outAttrs) {
        InputConnection ic = super.onCreateInputConnection(outAttrs);
        // Убираем флаг, который может скрывать Enter
        outAttrs.imeOptions &= ~EditorInfo.IME_FLAG_NAVIGATE_NEXT;
        outAttrs.imeOptions &= ~EditorInfo.IME_FLAG_NAVIGATE_PREVIOUS;
        outAttrs.inputType = InputType.TYPE_NULL; // Хак чтобы клавиатура работала, но текст не вставлялся сам

        return new InputConnectionWrapper(ic, true) {
            @Override
            public boolean commitText(CharSequence text, int newCursorPosition) {
                // Когда юзер вводит текст - шлем в SSH
                if (sessionId != null) {
                    TerminalManager.getInstance(null).write(sessionId, text.toString());
                }
                return true; // Не вызываем super, чтобы текст не дублировался локально
            }

            @Override
            public boolean sendKeyEvent(KeyEvent event) {
                if (event.getAction() == KeyEvent.ACTION_DOWN) {
                    if (sessionId != null) {
                        if (event.getKeyCode() == KeyEvent.KEYCODE_DEL) {
                            TerminalManager.getInstance(null).write(sessionId, "\u007f");
                        } else if (event.getKeyCode() == KeyEvent.KEYCODE_ENTER) {
                            TerminalManager.getInstance(null).write(sessionId, "\r");
                        } else {
                            // Остальные спецклавиши
                            return super.sendKeyEvent(event); 
                        }
                    }
                }
                return true;
            }
            
            @Override
            public boolean deleteSurroundingText(int beforeLength, int afterLength) {
                // Обработка Backspace на некоторых клавиатурах (Gboard)
                if (beforeLength == 1 && afterLength == 0) {
                     if (sessionId != null) TerminalManager.getInstance(null).write(sessionId, "\u007f");
                     return true; 
                }
                return super.deleteSurroundingText(beforeLength, afterLength);
            }
        };
    }
}