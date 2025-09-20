package eui;

import arc.Core;
import mindustry.game.EventType;
import mindustry.gen.Call;
import mindustry.mod.Mod;
import arc.Events;
import mindustry.Vars;

public class core extends Mod {
    public boolean isAutoGG = false;
    public core() {
        Events.run(EventType.Trigger.class, () -> {
            if ((Vars.state.teams.cores(Vars.player.team()).size == 0 || Vars.state.rules.canGameOver) &&
                    Core.settings.getBool("eui-AlertMarker", true) && !isAutoGG) {
                Call.sendChatMessage("gg");
                isAutoGG = true;
            }
        });
        Events.on(EventType.WorldLoadEvent.class, e -> isAutoGG = false);
    }

    @Override
    public void loadContent() {
        Settings.load();
    }
}