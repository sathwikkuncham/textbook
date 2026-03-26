## Diagram: 5.1 Interactive Rebase Operations

This diagram illustrates the transformation process of a messy commit history into 
a polished sequence using the `git rebase -i` command.

╔══════════════════════════════════════════════════════════════════════════════╗
║                    INTERACTIVE REBASE: HISTORY REFINEMENT                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  MESSY HISTORY (Before)             INTERACTIVE TODO LIST                    ║
║  ┌───────────────┐                 ┌────────────────────────────────────┐    ║
║  │ 8a2f3: fix typo│ <──────── pick │ 8a2f3 fix typo                     │    ║
║  ├───────────────┤                 ├────────────────────────────────────┤    ║
║  │ 4c1d2: debug   │ <─────── drop  │ d 4c1d2 debug (removes commit)     │    ║
║  ├───────────────┤                 ├────────────────────────────────────┤    ║
║  │ b9e01: feat A  │ <────── squash │ s b9e01 feat A (joins with 7d3a2)  │    ║
║  ├───────────────┤                 ├────────────────────────────────────┤    ║
║  │ 7d3a2: update  │ <────── reword │ r 7d3a2 update (change message)    │    ║
║  └───────┬───────┘                 └──────────────────┬─────────────────┘    ║
║          │                                            │                      ║
║          ▼                                            ▼                      ║
║  ┌────────────────────────────────────────────────────────────────────────┐  ║
║  │                     CLEAN PULL REQUEST (Resulting State)               │  ║
║  ├────────────────────────────────────────────────────────────────────────┤  ║
║  │  [ New Hash X ]  Feature A: Complete implementation (Clean Message)    │  ║
║  ├────────────────────────────────────────────────────────────────────────┤  ║
║  │  [ New Hash Y ]  Fix typo in documentation                             │  ║
║  └────────────────────────────────────────────────────────────────────────┘  ║
╚══════════════════════════════════════════════════════════════════════════════╝

**Caption:** The diagram shows how specific commands (pick, drop, squash, reword) 
transform a fragmented history into a professional, readable series of commits 
suitable for merging into a main codebase.


## Diagram: 5.2 The Reflog Safety Net

This diagram visualizes how the Reference Log (Reflog) acts as a chronological 
recording of where `HEAD` has been, allowing for recovery even after destructive 
operations like branch deletion or failed rebases.

╔══════════════════════════════════════════════════════════════════════════════╗
║                      GIT REFLOG: THE DISASTER RECOVERY LOG                   ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║   CHRONOLOGICAL LOG (Reflog)              COMMIT GRAPH (Physical Objects)    ║
║  ┌──────────────────────────────┐        ┌──────────────────────────────┐    ║
║  │ INDEX │ ACTION     │ POINTER │        │                              │    ║
║  ├───────┼────────────┼─────────┤        │   [C] <── [D]  (Orphaned)    │    ║
║  │ @{0}  │ checkout   │ main    │        │            ↑   (Lost Branch) │    ║
║  │ @{1}  │ rebase     │ 5f2a1   │        │            │                 │    ║
║  │ @{2}  │ commit     │ d3b12   │──┐     │   [A] <── [B] <── [E] (Main)   │    ║
║  │ @{3}  │ branch -D  │ c99a4   │──┼─────│────┐                         │    ║
║  └───────┴────────────┴─────────┘  │     │    │                         │    ║
║                                    │     └────┼──▶ [c99a4]              │    ║
║   RECOVERY WORKFLOW                │          │    "Deleted" Commit     │    ║
║  ┌──────────────────────────────┐  │          └─────────────────────────┘    ║
║  │ 1. Locate lost hash in log   │◀─┘                                         ║
║  │ 2. Use: git checkout <hash>  │      ◆ Key Concept:                        ║
║  │ 3. Or:  git reset --hard @{n}│      Commits aren't deleted immediately;   ║
║  └──────────────────────────────┘      only the branch pointers are gone.    ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

**Caption:** While the Commit Graph may lose track of nodes when branches are 
deleted or rebases go wrong, the Reflog (on the left) maintains a linear history 
of every `HEAD` movement, providing the hashes needed to restore lost work.