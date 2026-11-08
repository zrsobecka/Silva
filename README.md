# Silva

Silva to lokalna aplikacja na Windows do zapisywania codziennych działań i postępów w dłuższych celach.

- **Dzisiaj** pozwala przypiąć jeden następny krok na dziś i szybko dodać pojedynczą sprawę. Pokazuje też nawyki, zadania tygodniowe i miesięczne oraz dzisiejsze wpisy. Odhaczenie pozycji zapisuje ją w historii. Drugie kliknięcie cofa wpis.
- **Plan** pokazuje pozycje według typu (Zadania, Nawyki, Cele i Praca) lub według grup z ikonami, takich jak Gry, Ruch i Nauka. W obu widokach można filtrować po aktywności. Przycisk **Archiwum** otwiera listę zarchiwizowanych pozycji, które można przywrócić.
- **Grupa w Planie** służy do porządkowania zadań. Możesz ją wybrać samodzielnie lub pozwolić Silvie dopasować ją według aktywności. **Aktywność w Postępie** określa, gdzie trafiają wcześniejsze i przyszłe wykonania. Zadanie z pustym polem aktywności też trafia do historii po odhaczeniu.
- **Dodaj wkład** zapisuje w historii zrobioną rzecz z wybraną datą i obszarem. W zależności od obszaru można podać liczby, np. minuty, pytania czy mecze Solo Queue i Flex. Wpis może mieć link.
- **Postęp** pokazuje mozaikę tygodnia, miesiąca lub roku. Jeden wpis to jeden kwadrat, a stały kolor oznacza aktywność. Kliknięcie nazwy wyróżnia aktywność i filtruje historię; kliknięcie kwadratu pokazuje szczegóły, a miesiąca w roku otwiera jego mozaikę. Ręczne wkłady można edytować, a zapisane ilości sumują się dla wybranej aktywności.

W celu można zapisać konkretne kroki i oznaczyć go jako ukończony. Dzienny licznik na pulpicie dotyczy wyłącznie codziennych nawyków. Wykresy uwzględniają wykonane zadania, kroki w celach i samodzielnie dodane wkłady.

Po zbudowaniu aplikację otwiera skrót **Silva** na pulpicie lub plik `app/Silva.exe`. Nowy profil zaczyna z pustym planem.

## Dane i prywatność

Silva przechowuje zadania, cele i historię w lokalnej bazie SQLite. Domyślna ścieżka na Windows to `%USERPROFILE%/.silva/silva.sqlite3`. Przy pierwszym uruchomieniu z tą lokalizacją Silva kopiuje istniejący profil z AppData, uwzględniając kopię przekierowaną przez Windows dla Codex. Oryginały zostają zachowane; kilka różnych profili z zapisami wymaga rozstrzygnięcia zamiast automatycznego nadpisania. Aplikacja działa bez konta, synchronizacji i telemetrii. Publikacja kodu nie publikuje bazy. Katalogi z lokalnymi danymi, eksportami i pliki baz są też wykluczone przez `.gitignore`.

## Praca nad projektem

Potrzebne są Node.js 24, Rust z narzędziami MSVC, WebView2 i PowerShell 7.

- `npm ci` instaluje zależności zapisane w pliku blokady.
- `npm run tauri -- dev` uruchamia Silvę w trybie programistycznym.
- `npm run check:all` sprawdza format, lint, testy i kompilację frontendu oraz Rusta.
- `npm run update:local` buduje i aktualizuje przenośny plik `app/Silva.exe`.
- `npm run update:local -- -DesktopShortcut` aktualizuje też skrót na pulpicie.

Układ projektu i reguły historii są opisane w [ai/project/architecture.md](ai/project/architecture.md).
