package pro.kaleert.XKode.views;

import com.facebook.react.uimanager.SimpleViewManager;
import com.facebook.react.uimanager.ThemedReactContext;
import com.facebook.react.uimanager.annotations.ReactProp;

public class TerminalViewManager extends SimpleViewManager<ConsoleView> {
    public static final String REACT_CLASS = "NativeTerminalView";

    @Override
    public String getName() {
        return REACT_CLASS;
    }

    @Override
    protected ConsoleView createViewInstance(ThemedReactContext reactContext) {
        return new ConsoleView(reactContext);
    }

    @ReactProp(name = "sessionId")
    public void setSessionId(ConsoleView view, String sessionId) {
        view.setSessionId(sessionId);
    }
}