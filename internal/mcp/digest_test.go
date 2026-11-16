package mcp

import "testing"

func TestTaskSectionStopsAtTopHeading(t *testing.T) {
	desc := "# Описание кластера\nшапка\n# Задача\nПервая строка\n## Подраздел\nхвост\n# Связи\nне нужно"
	got := taskSection(desc)
	want := "Первая строка\n## Подраздел\nхвост"
	if got != want {
		t.Fatalf("taskSection = %q, want %q", got, want)
	}
}

func TestTaskSectionMissing(t *testing.T) {
	if got := taskSection("# Описание\nтекст"); got != "" {
		t.Fatalf("taskSection without heading = %q, want empty", got)
	}
}

func TestCutTextRunes(t *testing.T) {
	got, cut := cutText("абвгд", 3)
	if got != "абв…" || !cut {
		t.Fatalf("cutText = %q,%v", got, cut)
	}
	got, cut = cutText("ab", 3)
	if got != "ab" || cut {
		t.Fatalf("cutText short = %q,%v", got, cut)
	}
}
