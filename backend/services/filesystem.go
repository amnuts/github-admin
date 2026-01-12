package services

import (
	"os"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type FilesystemCommands struct{}

func (fs *FilesystemCommands) SelectDestinationDirectory() string {
	result, _ := application.Get().Dialog.OpenFile().
		CanChooseDirectories(true).
		CanCreateDirectories(true).
		ResolvesAliases(true).
		PromptForSingleSelection()
	return result
}

func (fs *FilesystemCommands) PathExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}
