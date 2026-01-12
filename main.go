package main

import (
	"embed"
	_ "embed"
	"log"

	"github.com/amnuts/github-admin/backend/services"
	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

// Wails uses Go's `embed` package to embed the frontend files into the binary.
// Any files in the frontend/dist folder will be embedded into the binary and
// made available to the frontend.
// See https://pkg.go.dev/embed for more information.

//go:embed all:frontend/dist
var assets embed.FS

// main function serves as the application's entry point. It initializes the application, creates a window,
// and starts a goroutine that emits a time-based event every second. It subsequently runs the application and
// logs any error that might occur.
func main() {
	cfg, err := services.LoadConfig()
	if err != nil {
		log.Fatal(err)
	}

	appTheme := services.GetAppTheme(cfg.Theme)

	configService := &services.AppConfigService{}

	app := application.New(application.Options{
		Name:        "github-admin",
		Description: "GitHub Admin",
		Services: []application.Service{
			application.NewService(&services.GitHubService{}),
			application.NewService(&services.FilesystemCommands{}),
			application.NewService(&services.VersionService{}),
			application.NewService(configService),
		},
		Assets: application.AssetOptions{
			Handler: application.AssetFileServerFS(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: true,
		},
	})

	// Create a new window
	windowOptions := application.WebviewWindowOptions{
		Name:                       "main",
		Title:                      "GitHub Admin",
		URL:                        "/",
		Width:                      1280,
		Height:                     1024,
		Frameless:                  false,
		DefaultContextMenuDisabled: true,
		Windows: application.WindowsWindow{
			BackdropType:        application.Acrylic,
			Theme:               appTheme,
			EnableSwipeGestures: false,
		},
		Mac: application.MacWindow{
			InvisibleTitleBarHeight: 50,
			Backdrop:                application.MacBackdropTranslucent,
			TitleBar:                application.MacTitleBarHiddenInset,
		},
	}
	if cfg.RememberPos {
		if cfg.WindowWidth > 0 {
			windowOptions.Width = cfg.WindowWidth
		}
		if cfg.WindowHeight > 0 {
			windowOptions.Height = cfg.WindowHeight
		}
		if cfg.WindowX != -1 && cfg.WindowY != -1 {
			windowOptions.X = cfg.WindowX
			windowOptions.Y = cfg.WindowY
		}
	}

	mainWindow := app.Window.NewWithOptions(windowOptions)

	if cfg.WindowX == -1 || cfg.WindowY == -1 {
		mainWindow.Center()
	}

	// Systray
	tray := app.SystemTray.New()
	trayMenu := app.NewMenu()
	trayMenu.Add("Settings").OnClick(func(ctx *application.Context) {
		configService.ShowSettings()
	})
	trayMenu.AddSeparator()
	trayMenu.Add("Quit").OnClick(func(ctx *application.Context) {
		mainWindow.Close()
	})
	tray.SetMenu(trayMenu)

	mainWindow.OnWindowEvent(events.Common.WindowClosing, func(event *application.WindowEvent) {
		currentCfg, err := services.LoadConfig()
		if err != nil {
			return
		}
		if currentCfg.RememberPos {
			x, y := mainWindow.Position()
			w, h := mainWindow.Size()
			currentCfg.WindowX, currentCfg.WindowY = x, y
			currentCfg.WindowWidth, currentCfg.WindowHeight = w, h
			_ = services.SaveConfig(currentCfg)
		}
	})

	// Run the application.
	err = app.Run()
	if err != nil {
		log.Fatal(err)
	}
}
