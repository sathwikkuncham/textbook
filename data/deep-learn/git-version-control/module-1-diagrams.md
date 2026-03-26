## Diagram: 1.1: Snapshots vs. Diffs

This diagram compares how traditional Version Control Systems (VCS) store changes as a series of incremental "deltas" (like an accounting ledger) versus how Git captures the entire state of the project as a "snapshot" (like a camera).

```text
      DELTA-BASED (Traditional)                SNAPSHOT-BASED (Git)
    "The Accounting Ledger"                  "The High-Speed Camera"
 ──────────────────────────────────       ──────────────────────────────────
   BASE FILE          CHANGES               SNAPSHOT 1       SNAPSHOT 2
 ┌──────────┐       ┌──────────┐          ╔══════════╗     ╔══════════╗
 │  File A  │──────▶│ + line 5 │          ║  File A  ║     ║  File A' ║
 │  (v1)    │       │ - line 2 │          ║  (v1)    ║     ║  (v2)    ║
 └──────────┘       └──────────┘          ╚══════════╝     ╚══════════╝
                          │                      │                │
                          ▼                      ▼                ▼
                    ┌──────────┐          ╔══════════╗     ╔══════════╗
                    │ + line 8 │          ║  File B  ║     ║  File B  ║
                    │ (change) │          ║  (v1)    ║─────▶  (link)  ║
                    └──────────┘          ╚══════════╝     ╚══════════╝
 ──────────────────────────────────       ──────────────────────────────────
  RECONSTRUCTION: To see v3, the           INTEGRITY: Every version is a
  system must calculate all math           complete state. If File B hasn't
  operations from the start.               changed, Git simply links to it.
```

**Caption:** While Delta-based systems store "what changed," Git's Snapshot model stores "what it looks like." This ensures data integrity because Git uses the file content to determine the address (SHA-1), making it impossible to change file contents without Git noticing.


## Diagram: 1.2: The Four Object Types

This diagram illustrates the hierarchy of Git's internal data model and how the SHA-1 hashing process links different object types together to represent a project's file structure.

```text
 ╔════════════════════════════════════════════════════════════════════════╗
 ║                          GIT OBJECT DATABASE                           ║
 ╚════════════════════════════════════════════════════════════════════════╝
          │
    ┌─────┴──────────────────────────────────────────────────────┐
    │ 🏷️  TAG        [Name/Message] ──▶ Points to a specific Commit│
    └─────┬──────────────────────────────────────────────────────┘
          │
          ▼
    ┌────────────────────────────────────────────────────────────┐
    │ 📄  COMMIT     [Author/Message/Timestamp]                   │
    │                [Pointer to Tree Root] ─────────────────┐    │
    │                [Pointer to Parent Commit]              │    │
    └────────────────────────────────────────────────────────┴────┘
                                                             │
          ┌──────────────────────────────────────────────────┘
          ▼
    ┌─────────────────────────────────────────────────────────────┐
    │ 📂  TREE       [Directory Listing]                          │
    │                [Mode] [Type] [SHA-1 Hash] [Filename]        │
    └─────┬──────────────────────────────┬────────────────────────┘
          │                              │
          ▼                              ▼
    ┌──────────────┐              ┌──────────────────────────────┐
    │ 📄  BLOB     │              │ 📂  TREE (Sub-directory)     │
    │ [File Content]              │ [Pointers to more Blobs/Trees]│
    └──────────────┘              └──────────────────────────────┘

 ● SHA-1 HASHING: Content ──▶ [Algorithm] ──▶ 40-char unique ID (e.g. 5f2a...)
```

**Caption:** The **Commit** points to a **Tree** (the root directory). The **Tree** lists filenames and points to **Blobs** (file content) or other **Trees** (sub-folders). **Tags** provide a persistent, human-readable name for a specific commit.


## Diagram: 1.3: The Directed Acyclic Graph (DAG)

This diagram shows how Git organizes history. Each commit points back to its parent(s), forming a graph that flows in one direction and never loops back on itself (Acyclic).

```text
  LEGEND:  ( ) = Commit Node    [ ] = Branch/Pointer    ──▶ = Parent Pointer
 ══════════════════════════════════════════════════════════════════════════════

                                [feature]
                                   │
                                   ▼
    ( C1 ) ◀────── ( C2 ) ◀────── ( C4 ) ◀────── ( C5 )
      ▲              ▲
      │              │          [main]
      │              │             │
      │              │             ▼
      └──────────── ( C3 ) ◀────── ( C6 )
                                   ▲
                                   │
                                [HEAD] (Currently working here)

 ──────────────────────────────────────────────────────────────────────────────
  1. NODES:   Commits (C1-C6) are immutable snapshots.
  2. EDGES:   Arrows point to PARENTS (backward in time).
  3. POINTERS: Branch names (main, feature) are just labels pointing to a hash.
  4. HEAD:     A special pointer indicating which commit is currently checked out.
```

**Caption:** The DAG structure allows for complex branching and merging. Because pointers (branches) are lightweight, switching contexts is nearly instantaneous. The graph only grows; existing history (nodes) remains unchanged, ensuring a reliable audit trail.