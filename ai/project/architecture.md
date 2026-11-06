# Architektura Silvy

React, TypeScript, Vite i Tailwind działają w `frontend/`. Tauri, Rust i lokalna baza SQLite należą do `src-tauri/`. Skrypty Windows są w `scripts/`, a gotowy program w ignorowanym przez Git katalogu `app/`.

## Zapis i odczyt

Interfejs odczytuje i aktualizuje dane przez typowany adapter Tauri w `frontend/src/infrastructure/plan.ts`. Rust waliduje akcję, wykonuje zmianę w transakcji SQLite i zwraca stan planu oraz historię. Wykresy i wieże korzystają z jednej historii wyświetlanej w interfejsie. Łączy ona wykonania zadań, kroki celów i samodzielnie dodane wkłady. Każdy wpis to jedna cegiełka w swojej grupie. Ilości zapisane we wkładach są sumowane osobno.

Doba jest liczona w czasie lokalnym, tydzień od poniedziałku, a miesiąc według kalendarza. Każde zadanie cykliczne ma najwyżej jeden wpis wykonania na okres. Kroki w celach są osobnymi wpisami z datą i opisem. Po edycji lub archiwizacji zadania wcześniejsze wpisy zachowują nazwę i grupę z chwili zapisu.

Przy otwarciu bazy Silva sprawdza `PRAGMA user_version` i wykonuje potrzebne migracje w transakcji. Wersja 2 dodaje tabelę `contributions`, a wersja 3 opcjonalną wieżę w tabeli `tasks`. Wieże korzystają z aktualnego przypisania zadania, więc zmiana obejmuje także wcześniejsze wpisy bez ich kopiowania lub edycji. Do sprawdzania gotowego pliku można uruchomić proces z ustawionym `SILVA_DATA_DIR` wskazującym osobny bezwzględny katalog na bazę testową. Ignorowany plik `src-tauri/tauri.windows.conf.json` może lokalnie zachować identyfikator istniejącej instalacji.
