let selectedExePath = null;

$('#logo').attr("src", config.serverlogo);

$(function() {

    const iframeEl = document.getElementById("gameIframe");
    const allowedIframeOrigin = config.website;


    window.addEventListener("message", async (event) => {
        if (event.origin !== allowedIframeOrigin) return;
        if (event.source !== iframeEl.contentWindow) return;
        const msg = event.data;
        if (!msg || msg.type !== "LAUNCHER_BUTTON_CLICK") return;
        switch (msg.button) {
            case "join":
            await join();
            break;
            default:
            console.log("Unbekannte Aktion:", msg.button, msg);
        }
    });


    function init() {
        checkcfg();
    }


    function checkcfg() {
        if (window.launcherAPI && typeof window.launcherAPI.getConfig === "function") {
            window.launcherAPI.getConfig().then(config => {
                if (config && config.selectedExePath) {
                    selectedExePath = config.selectedExePath;
                }
                $(".loading-screen").hide();
                $("#settings").show();
                $("#mainContent").show();
            }).catch(error => {
                $(".loading-screen").hide();
                $("#settings").show();
                $("#mainContent").show();
            });
        } else {
            $(".loading-screen").hide();
            $("#settings").show();
            $("#mainContent").show();
        }
    }

    $(".join-button").on("click", async function() {
        await join();
    });


    $(".settings").on("click", async function() {
        if (!window.launcherAPI || typeof window.launcherAPI.selectExe !== "function") {
            Notify("error", "Electron API nicht verfugbar. Bitte Launcher uber Electron starten.");
            return;
        }
        selectedExePath = await window.launcherAPI.selectExe();
        if (!selectedExePath) {
            Notify("error", "Keine EXE ausgewahlt.");
            return;
        }
        $("#selectedFolderPath").text(selectedExePath);
        if (window.launcherAPI && typeof window.launcherAPI.saveConfig === "function") {
            const saveResult = await window.launcherAPI.saveConfig({ selectedExePath });
            if (!saveResult || !saveResult.ok) {
                Notify("error", "Config konnte nicht gespeichert werden: " + saveResult?.error);
                $(".error").show();
            } else if (saveResult.ok) {
                $(".error").hide();
                $("#setup").hide();
                $("#gameIframe").show();
            }
        }
    });


    async function IsRunning(processName) {
        try {
            const result = await window.launcherAPI.checkProcess(processName);
            if (!result || !result.ok) {
                Notify("error", "Fehler bei der Prozessüberprüfung: " + result?.error);
                return false;
            }
            return !!result.isRunning;
        } catch (error) {
            Notify("error", "Fehler bei der Prozessüberprüfung: " + error.message);
            return false;
        }
    }


    async function join() {
        if (!selectedExePath) {
            Notify("error", "Bitte zuerst eine EXE auswahlen. Klicke dazu auf das Zahnrad oben rechts.");
            return;
        }
        if (!window.launcherAPI || typeof window.launcherAPI.launchExe !== "function") {
            Notify("error", "Electron API nicht verfugbar. Bitte Launcher uber Electron starten.");
            return;
        }
        const isRunning = await IsRunning(config.processName);
        if (!isRunning) {
            const result = await window.launcherAPI.launchExe(selectedExePath);
            if (!result || !result.ok) {
                Notify("error", result?.error || "Fehler beim Starten. Prufe den EXE Pfad. Klicke dazu auf das Zahnrad oben rechts.");
                return;
            }
        }
        const timeout = 60 * 3; // 3 Minuten
        const startTime = Date.now();
        let processStarted = false;
        while ((Date.now() - startTime) < timeout * 1000) {
            if (await IsRunning("GTAProcess")) {
                processStarted = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        if (!processStarted) {
            Notify("error", "Das Spiel konnte nicht gestartet werden oder hat zu lange zum Starten gebraucht. Bitte versuche es erneut.");
            return;
        }
        const conntime = 15;
        for (let i = conntime; i > 0; i--) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            Notify("success", `Du wirst in Kürze mit dem Server verbunden... ${i}`);
        }
        Notify("hide");
        
        const direct = await window.launcherAPI.runCmdCommand("start " + config.connect); 
        if (!direct || !direct.ok) {
            Notify("error", "Automatischer Verbindungsversuch fehlgeschlagen. Bitte verbinde manuell mit dem Server: " + config.connect_command);
            return;
        }
    }


    function Notify(type, message) {
        if (type === "error") {
            $("#notify").removeClass("success warning").addClass("error");
            $("#notifyTitle").text("Fehler");
            $("#notifyMessage").text(message);
            $("#notify").show();
        } else if (type === "success") {
            $("#notify").removeClass("error warning").addClass("success");
            $("#notifyTitle").text("Erfolg");
            $("#notifyMessage").text(message);
            $("#notify").show();
        } else if (type === "warning") {
            $("#notify").removeClass("error success").addClass("warning");
            $("#notifyTitle").text("Warnung");
            $("#notifyMessage").text(message);
            $("#notify").show();
        } else if (type === "hide") {
            $("#notify").hide();
        }
    }

    setTimeout(init, 2000);
});


setInterval(() => {
    const baseUrl = config.website;
    const iframe = document.querySelector("iframe");
    if (iframe) {
        iframe.src = `${baseUrl}?_t=${Date.now()}`;
    }
}, 2000);