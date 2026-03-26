## Diagram: 3.1 The Remote Bridge

**Description:** This diagram illustrates the three-tier architecture of Git remotes, showing the relationship between your local work, the local "cache" of the server (remote-tracking branches), and the actual remote server.

```text
╔══════════════════════════════════════════════════════════════════════════╗
║                          LOCAL WORKSTATION                               ║
║  ┌────────────────────┐          ┌──────────────────────────────────┐    ║
║  │  WORKING BRANCH    │          │     REMOTE-TRACKING BRANCH       │    ║
║  │   (e.g., main)     │          │      (e.g., origin/main)         │    ║
║  └──────────┬─────────┘          └────────────────┬─────────────────┘    ║
║             │                                     │                      ║
║             │            git merge                │                      ║
║             │<────────────────────────────────────┤                      ║
║             │      (Update local branch)          │                      ║
║             │                                     │                      ║
║             │            git pull                 │      git fetch       ║
║             │<════════════════════════════════════╪═══════════════════╗  ║
║             │    (Fetch + Merge in 1 step)        │                   ║  ║
╚═════════════╪═════════════════════════════════════╪═══════════════════║══╝
              │                                     │                   ║
              │            git push                 │                   ║
              ├────────────────────────────────────>│      REMOTE       ║
              │      (Upload local commits)         │      SERVER       ║
              │                                     │     (origin)      ║
              │                                     │                   ║
              └────────────────────────────────────>│                   ║
                                                    └───────────────────┘
```

**Caption:** The **Remote-Tracking Branch** acts as a bridge. `git fetch` updates your local "snapshot" of the server (`origin/main`), while `git merge` applies those changes to your active work. `git pull` combines these two distinct operations.


## Diagram: 3.2 Standard Workflows & CI/CD

**Description:** A visualization of the **GitHub Flow** pattern, emphasizing the integration of Pull Requests (PRs) and Continuous Integration (CI/CD) pipelines in a professional environment.

```text
  MAIN BRANCH  ────────────────●───────────────────────────────●───> [Deploy]
  (Production)                 │                               ^
                               │  git checkout -b              │ git merge
                               ↓                               │ (after PR)
  ┌────────────────────────────────────────────────────────────┴──────────┐
  │ FEATURE BRANCH             ●──────────●──────────●                    │
  │ (Development)        (Commits)         │          │                    │
  └────────────────────────────────────────┼──────────┼────────────────────┘
                                           │          │
                                   ┌───────▼──────────┴───────┐
                                   │   PULL REQUEST OPENED    │
                                   ├──────────────────────────┤
                                   │  1. Code Review          │
                                   │  2. CI Build / Tests  ✓  │
                                   │  3. Security Scan     ✓  │
                                   └──────────────────────────┘
```

**Caption:** In **GitHub Flow**, the main branch is always deployable. Feature branches are short-lived. The **Pull Request** serves as the gateway where automated **CI/CD** and human peer reviews must pass before code is merged back to main.


## Diagram: 3.3 Safe History Rewriting

**Description:** This state diagram compares the dangerous standard force push (`-f`) against the safer `--force-with-lease` by showing the internal logic check performed before overwriting history.

```text
   YOUR INTENTION: Overwrite remote history with your local reflog.
   
   ┌──────────────────────────────────────────────────────────────────┐
   │ COMMAND: git push --force-with-lease                             │
   └───────────────────────────────┬──────────────────────────────────┘
                                   │
                  ┌────────────────▼────────────────┐
                  │ Does [origin/main] match the    │
                  │ current state on the SERVER?    │
                  └────────┬───────────────┬────────┘
                           │               │
                 YES (Safe)│               │ NO (Someone else pushed!)
                           │               │
         ╔═════════════════▼═══╗       ┌───▼──────────────────────────┐
         ║   UPDATE ACCEPTED   ║       │       UPDATE REJECTED        │
         ║                     ║       │                              │
         ║ Remote history is   ║       │ "Stale Info": You must fetch │
         ║ rewritten to match  ║       │ and integrate new changes    │
         ║ your local commits. ║       │ first to avoid losing work.  │
         ╚═════════════════════╝       └──────────────────────────────┘
```

**Caption:** **--force-with-lease** is the gold standard for shared branch etiquette. It acts as a safety trigger: it will only allow a force push if your local remote-tracking branch is up-to-date with the server, ensuring you don't accidentally overwrite a colleague's commits.