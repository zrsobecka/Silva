# Silva

Silva to lokalna aplikacja na Windows do zapisywania codziennych działań i postępów w dłuższych celach.

- **Dzisiaj** pokazuje codzienne nawyki, sprawy bieżące oraz zadania na ten tydzień i miesiąc. Odhaczenie pozycji zapisuje ją w historii. Drugie kliknięcie cofa wpis.
- **Plan** służy do dodawania i edytowania zadań, grup i celów. W polu grupy można wpisać własną nazwę. Archiwizacja chowa pozycję z planu, zachowując jej historię.
- W edycji zadania można wybrać **Wieżę postępu**. Dotychczasowe i nowe wpisy tego zadania liczą się w wybranej wieży, a grupa w Planie i zapisana historia pozostają bez zmian.
- **Dodaj wkład** zapisuje w historii zrobioną rzecz z wybraną datą i obszarem. W zależności od obszaru można podać liczby, np. minuty, pytania czy mecze Solo Queue i Flex. Wpis może mieć link.
- **Postęp** pokazuje wieże dotychczasowych i nowych grup oraz aktywność w miesiącu lub roku. Każdy wpis dodaje jedną cegiełkę do wieży, a wpisane ilości sumują się osobno. Kliknięcie wieży pokazuje historię i osobną listę pozycji z planu. Samodzielnie dodane wkłady można poprawić.

W celu można zapisać konkretne kroki i oznaczyć go jako ukończony. Dzienny licznik na pulpicie dotyczy wyłącznie codziennych nawyków. Wykresy uwzględniają wykonane zadania, kroki w celach i samodzielnie dodane wkłady.

Po zbudowaniu aplikację otwiera skrót **Silva** na pulpicie lub plik `app/Silva.exe`. Nowy profil zaczyna z pustym planem.

## Dane i prywatność

Silva przechowuje zadania, cele i historię w lokalnej bazie SQLite. Domyślna ścieżka na Windows to `%LOCALAPPDATA%/app.silva.desktop/silva.sqlite3`. Aplikacja działa bez konta, synchronizacji i telemetrii. Publikacja kodu nie publikuje bazy. Katalogi z lokalnymi danymi, eksportami i pliki baz są też wykluczone przez `.gitignore`.

## Praca nad projektem

Potrzebne są Node.js 24, Rust z narzędziami MSVC, WebView2 i PowerShell 7.

- `npm ci` instaluje zależności zapisane w pliku blokady.
- `npm run tauri -- dev` uruchamia Silvę w trybie programistycznym.
- `npm run check:all` sprawdza format, lint, testy i kompilację frontendu oraz Rusta.
- `npm run update:local` buduje i aktualizuje przenośny plik `app/Silva.exe`.
- `npm run update:local -- -DesktopShortcut` aktualizuje też skrót na pulpicie.

Układ projektu i reguły historii są opisane w [ai/project/architecture.md](ai/project/architecture.md).
