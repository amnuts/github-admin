package services

var Version = "0.0.1"

type VersionService struct{}

func (s *VersionService) GetVersion() string {
	return Version
}
