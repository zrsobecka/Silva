# Architektura Silvy

React, TypeScript, Vite i Tailwind działają w `frontend/`. Tauri, Rust i lokalna baza SQLite należą do `src-tauri/`. Skrypty Windows są w `scripts/`, a gotowy program w ignorowanym przez Git katalogu `app/`.

## Zapis i odczyt

Interfejs wywołuje dwie komendy Tauri przez typowany adapter w `frontend/src/infrastructure/plan.ts`. Rust waliduje akcję, wykonuje zmianę w transakcji SQLite i zwraca stan planu oraz historię. SQLite jest źródłem danych. Wykresy powstają z tych samych wpisów, które widać na liście aktywności.

Doba jest liczona w czasie lokalnym, tydzień od poniedziałku, a miesiąc według kalendarza. Każde zadanie cykliczne ma najwyżej jeden wpis wykonania na okres. Kroki w celach są osobnymi wpisami z datą i opisem. Po edycji lub archiwizacji zadania wcześniejsze wpisy zachowują nazwę i grupę z chwili zapisu.

Tabele są tworzone raz, przy pierwszym odczycie nowej, pustej bazy. Do sprawdzania gotowego pliku można uruchomić proces z ustawionym `SILVA_DATA_DIR` wskazującym osobny bezwzględny katalog na bazę testową. Ignorowany plik `src-tauri/tauri.windows.conf.json` może lokalnie zachować identyfikator istniejącej instalacji.
