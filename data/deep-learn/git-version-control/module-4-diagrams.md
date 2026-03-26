## Diagram: 4.1 Git Stash: Temporary Storage

This state diagram illustrates the movement of changes between the Working Directory, the Index (Staging Area), and the Stash Stack, highlighting how untracked files require specific flags.

```text
       WORKING DIRECTORY                     GIT STASH STACK (LIFO)
    ┌──────────────────────┐               ╔═════════════════════════╗
    │  Tracked Changes     │──git stash───>║ stash@{0}: latest work  ║
    │  (Modified/Staged)   │<──git pop──── ║                         ║
    └──────────┬───────────┘               ╠═════════════════════════╣
               │                           ║ stash@{1}: older work   ║
    ┌──────────┴───────────┐               ║                         ║
    │   Untracked Files    │               ╠═════════════════════════╣
    │   (New files)        │──git stash -u>║ stash@{2}: ...          ║
    └──────────────────────┘               ╚═════════════════════════╝
               ▲                                      │
               │            git stash apply           │
               └──────────────────────────────────────┘
                 (Restores changes but keeps stash)
```

**Caption:** Changes move from the working directory to the Stash Stack via `push`. While `pop` removes the top entry and applies it, `apply` restores changes while keeping the stash entry intact. The `-u` (untracked) flag is essential to include files not yet under version control.

---

## Diagram: 4.2 Git Bisect: Bug Hunting

This flow diagram represents the binary search process Git uses to find a "regresson" (the specific commit that introduced a bug) within a range of history.

```text
    COMMIT HISTORY (Binary Search Path)
    ───────────────────────────────────────────────────────────────────
    [C1] ─── [C2] ─── [C3] ─── [C4] ─── [C5] ─── [C6] ─── [C7] ─── [C8]
      │                                                              │
      └─ ● GOOD (Known)                                    BAD (Known) ● ─┘
    
    STEP 1: git bisect start [C8] [C1]
    ┌──────────────────────────────────────────────────────────────────┐
    │ Git checks out middle commit: [C4]                               │
    │ └─ Test Result: "Good" (Bug not present)                         │
    └───────────────────────────────┬──────────────────────────────────┘
                                    ▼
    STEP 2: Narrowing the search (Eliminates C1-C4)
    ┌──────────────────────────────────────────────────────────────────┐
    │ Git checks out middle of remaining: [C6]                         │
    │ └─ Test Result: "Bad" (Bug is present)                           │
    └───────────────────────────────┬──────────────────────────────────┘
                                    ▼
    STEP 3: Final check [C5]
    ┌──────────────────────────────────────────────────────────────────┐
    │ If [C5] is "Bad" -> [C5] is the culprit.                         │
    │ If [C5] is "Good" -> [C6] is the culprit.                        │
    └──────────────────────────────────────────────────────────────────┘
```

**Caption:** `git bisect` performs a binary search through history. By marking a "good" and "bad" commit, Git automatically checks out the midpoint commit for testing, halving the number of potential commits to investigate at every step.

---

## Diagram: 4.3 Cherry-Picking: Selective Application

This diagram visualizes the process of "Cherry-Picking," where a specific commit from one development line is copied and applied to another without merging the entire branch.

```text
    BRANCH: FEATURE-A
    ─────────────────
    [F1] ─── [F2: "Fix Bug X"] ─── [F3] ─── [F4]
                │
                │ (Pick this specific commit)
                │
                ▼ git cherry-pick [F2_SHA]
    
    BRANCH: MAIN (Production)
    ─────────────────────────
    [M1] ─── [M2] ─── [M3] ─── [F2']
                                 ▲
                                 │
                   New commit created on Main with 
                   the same patch/changes as [F2]
```

**Caption:** Cherry-picking allows developers to "pluck" a single commit (like a critical hotfix) from a feature branch and apply it to the main branch. This creates a new commit `[F2']` on the target branch that contains the exact functional changes of the original `[F2]`.