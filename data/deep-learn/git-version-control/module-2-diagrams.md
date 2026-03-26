## Diagram: 2.1 Merge vs. Rebase

This diagram compares the structural outcomes of merging versus rebasing a 
feature branch into a main branch, highlighting history preservation.

╔══════════════════════════════════════════════════════════════════════════════╗
║                          STRATEGY COMPARISON TABLE                           ║
╠══════════════╦══════════════════════════════╦════════════════════════════════╣
║   Feature    ║        git merge             ║        git rebase              ║
╠══════════════╬══════════════════════════════╬════════════════════════════════╣
║ History Type ║ Non-linear (Branching)       ║ Linear (Flat)                  ║
║ Mechanism    ║ Creates a "Merge Commit"     ║ Replays commits on new base    ║
║ Context      ║ Preserves original timeline  ║ Rewrites history for clarity   ║
╚══════════════╩══════════════════════════════╩════════════════════════════════╝

   [ MERGE: Context Preservation ]           [ REBASE: Replay Mechanism ]
   
      A---B---C  (main)                         A---B---C---D'---E' (main)
           \     /                                     ^         ^
            D---E   (feature)                          │         │
              ^                                  (New hashes created)
              └─ Merge commit preserves 
                 the branch's existence.

   ┌──────────────────────────────────┐      ┌─────────────────────────────────┐
   │ PRO: Shows exactly what happened │      │ PRO: Clean, easy-to-read logs   │
   │ CON: Can become a "marbles" mess │      │ CON: Risks if history is shared │
   └──────────────────────────────────┘      └─────────────────────────────────┘

**Caption:** While `merge` keeps the branch structure intact through a merge 
commit, `rebase` modifies the feature branch's base to the tip of main, 
creating a straight line of development by re-applying (replaying) changes.


## Diagram: 2.2 Merge Mechanics

This flow diagram illustrates the logic Git uses to determine whether a 
Fast-forward merge is possible or if a Three-way merge is required.

                      ┌───────────────────────────────┐
                      │ START: git merge [branch_B]   │
                      └───────────────┬───────────────┘
                                      │
                       Is [branch_A] a direct ancestor
                       of [branch_B]? (No new commits)
                                     / \
                            YES     /   \      NO
                 ┌─────────────────┘     └──────────────────┐
                 ▼                                          ▼
      ╔═══════════════════════╗              ╔════════════════════════════╗
      ║  FAST-FORWARD MERGE   ║              ║      THREE-WAY MERGE       ║
      ╠═══════════════════════╣              ╠════════════════════════════╣
      ║ Move pointer forward  ║              ║ Create new merge commit    ║
      ╚═══════════════════════╝              ╚════════════════════════════╝
                 │                                          │
        A---B (main/HEAD)                          A---B---C (main/HEAD)
             \                                      \     /
              C---D (feature)                        D---E (feature)
                 │                                     ▲   ▲
                 ▼                                     │   │
        A---B---C---D (main/HEAD)            [Common Ancestor (A)] found
                                             to calculate differences.

**Caption:** Git first looks for a **Common Ancestor**. If the current branch is 
at that ancestor, it performs a **Fast-forward**. If the branches have 
diverged, it uses a **Three-way merge** (Ancestor + Tip A + Tip B).


## Diagram: 2.3 The Detached HEAD State

This state diagram visualizes the relationship between HEAD, branches, and 
commits when moving from a standard state to a detached state and back.

    [ STANDARD STATE ]                   [ DETACHED HEAD STATE ]
    HEAD points to Branch                HEAD points to Hash
   
    ┌────────────┐                       ┌────────────┐
    │    HEAD    │                       │    HEAD    │
    └─────┬──────┘                       └─────┬──────┘
          │ (points to)                        │ (points to)
          ▼                                    ▼
    ┌────────────┐      ┌─────────┐      ┌─────────┐      ┌─────────┐
    │  [main]    │─────▶│ Commit  │      │ [main]  │─────▶│ Commit  │
    └────────────┘      │ f2a1c0  │      └─────────┘      │ f2a1c0  │
                        └─────────┘                       └─────────┘
                                                               ▲
          [ COMMAND ]                                          │
     git checkout f2a1c0  ─────────────────────────────────────┘

    ┌──────────────────────────────────────────────────────────────────┐
    │ WARNING: Commits made here are "Anonymous" and may be lost       │
    │ unless a branch is created before switching back.                │
    └──────────────────────────────────────────────────────────────────┘

    [ RECOVERY / ATTACHING ]
    
    Option A: Return to safety            Option B: Save work
    $ git switch main                     $ git switch -c new-branch-name
    (HEAD -> main)                        (HEAD -> new-branch -> commit)

**Caption:** In a **Detached HEAD** state, Git points directly to a commit hash 
rather than a branch pointer. To preserve work done in this state, you must 
create a new branch; otherwise, the "anonymous" commits will be orphaned when 
you switch away.