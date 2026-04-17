# Topic 31 · Variant A — Baseline (current production)

**Topic:** Psoriasis Pathophysiology: A 10-Mark Answer
**Module:** Etiology: Genetics and Environmental Triggers
**Subtopic:** Primary Genetic Determinants: PSORS Loci and HLA-Cw6
**Concepts:** PSORS1 locus and HLA-Cw6 association, Non-PSORS loci (PSORS2-9)
**Learner profile:** Advanced · PG exam 10-mark · Molecular depth · 4 months
**Latency:** 40693ms
**Word count:** 1079

---

Imagine a patient walking into your clinic. They recently recovered from a mild streptococcal sore throat, and now their trunk is covered in classic "dew drop" guttate psoriatic plaques. 

Why did this happen to *them*, while thousands of other people who got the exact same strep infection just took a few days of antibiotics and moved on? 

The answer lies in the genetic architecture of their skin and immune system. Psoriasis is a disease of a "loaded spring." The environment just releases the tension. If you are writing a 10-mark answer on psoriasis pathophysiology for your PG exams, the absolute best way to start is by demonstrating to the examiner that you understand exactly how this spring is constructed. 

Let's build the genetic framework of psoriasis from the ground up.

### 1. The Genetic Blueprint: Polygenic Susceptibility
Psoriasis isn't inherited in a simple Mendelian fashion (like Cystic Fibrosis or Sickle Cell). It is a complex, polygenic disease. This means that instead of inheriting one "broken" gene, a patient inherits a specific combination of genetic tweaks that collectively push their immune system closer to a threshold of hyper-reactivity.

Geneticists map these inherited tweaks to specific addresses on our chromosomes. In psoriasis, we call these addresses **PSORS** loci (Psoriasis Susceptibility loci). 

Historically, nine classic loci were mapped and named sequentially: **PSORS1 through PSORS9**. However, for your exam, you must make it clear that these loci are not equal in importance. There is one undisputed heavyweight champion, and a supporting cast.

### 2. The Heavyweight: PSORS1 and the Flawed "Display Tray"
Before we drop the heavy genetics, let's think about how the immune system monitors the skin. 

Every nucleated cell in the epidermis has a mechanism to show the immune system what is happening inside it. Think of these mechanisms as microscopic "display trays" held out on the cell surface. They grab pieces of proteins from inside the cell and display them to passing CD8+ T cells. Usually, the T cells inspect the tray, recognize the protein as "self," and move on.

In psoriasis, the patient inherits a very specific, highly reactive shape for their display tray. 

This specific "display tray" is the **HLA-Cw6** allele (specifically written as HLA-C*06:02). The gene that codes for this allele lives on **Chromosome 6p21.3**, right in the heart of the Major Histocompatibility Complex (MHC) region. 

This specific genetic address—Chromosome 6p21.3—is the **PSORS1** locus. It is the most critical fact in psoriasis genetics, accounting for roughly 35% to 50% of the disease's entire heritable risk. 

**But why does HLA-Cw6 cause psoriasis?**
Why does inheriting this specific display tray lead to scaly plaques? It comes down to binding affinity. The HLA-Cw6 tray happens to perfectly fit certain specific autoantigens. The two highest-yield autoantigens to remember for your exams are:
1.  **LL-37 (Cathelicidin):** An antimicrobial peptide released by damaged skin.
2.  **ADAMTSL5:** A protein produced by melanocytes.

When the HLA-Cw6 molecule grabs LL-37 or ADAMTSL5 and presents it to a CD8+ T cell, the T cell doesn't see "normal skin." It sees a threat. It activates, triggering the massive downstream inflammatory cascade that results in a psoriatic plaque. 

This molecular relationship directly explains the clinical picture. Patients who are positive for HLA-Cw6 typically present with **Type I Psoriasis**. For your exam, explicitly correlate HLA-Cw6 with:
*   Early onset (typically before age 40)
*   A strong family history
*   Guttate morphology (triggered by strep, which we will cover in the next section)
*   Strong Koebner phenomenon positivity

~~~mermaid
graph TD
    A[Chromosome 6p21.3: PSORS1 Locus] --> B[Encodes HLA-Cw6 Allele]
    B --> C[Altered Antigen Presentation]
    C --> D[Binds Autoantigens tightly: LL-37, ADAMTSL5]
    D --> E[Activates CD8+ T Cells in epidermis]
    E --> F[Initiates Psoriatic Inflammatory Cascade]
~~~
*Caption: The mechanistic pathway of the PSORS1 locus. Inheriting HLA-Cw6 leads directly to the presentation of self-antigens like LL-37, breaking immune tolerance.*

### 3. The Supporting Cast: Non-PSORS Loci (PSORS 2-9)
If HLA-Cw6 is so powerful, why doesn't everyone who carries it develop psoriasis? In fact, about 10-15% of the general healthy population carries the HLA-Cw6 allele, yet the prevalence of psoriasis is only about 2%. 

This is called *incomplete penetrance*. It tells us that HLA-Cw6 alone isn't enough to cause the disease. The patient needs other genetic vulnerabilities to tip the scales. 

These vulnerabilities are found in the minor loci: **PSORS2 through PSORS9**. 

When writing your 10-mark answer, don't just list chromosomes and numbers—examiners hate rote lists without context. Instead, group these loci by their *biological function*. The two most important non-PSORS1 loci to mention are those that affect the **skin barrier** and **innate immune signaling**.

**A. The Leaky Wall: PSORS4 (Chromosome 1q21)**
Imagine a castle with a hypersensitive guard (HLA-Cw6). If the castle walls are thick, the guard stays calm because nothing gets in. But if the walls are porous, debris constantly slips in, keeping the guard in a state of panic.

The **PSORS4** locus is the leaky wall. It is located on Chromosome 1q21, which houses the Epidermal Differentiation Complex (EDC). Within this complex are the **Late Cornified Envelope (LCE)** genes (specifically LCE3B and LCE3C). Mutations here mean the stratum corneum doesn't form perfectly. A compromised epidermal barrier allows microbes and physical stress to more easily penetrate and trigger the immune system.

**B. The Sensitive Alarm: PSORS2 (Chromosome 17q25)**
If PSORS4 is the leaky wall, **PSORS2** is a faulty, hyper-sensitive alarm system inside the castle. 
This locus contains the **CARD14** gene. CARD14 is an intracellular scaffolding protein that normally helps turn on NF-κB (a major inflammatory transcription factor) when the cell is stressed. Mutations in CARD14 lead to spontaneous, uncontrolled NF-κB activation. The keratinocytes start producing inflammatory cytokines even when there is no real threat. 

*(Note: The other loci—PSORS3, 5, 6, 7, 8, and 9—are minor contributors linked to various immune and structural functions. Mentioning their existence shows depth, but your detailed focus should remain on PSORS1, PSORS2, and PSORS4).*

~~~mermaid
graph TD
    Genetics[Genetic Architecture of Psoriasis] --> Major[Major Determinant]
    Genetics --> Minor[Minor Determinants]
    
    Major --> P1[PSORS1: Chromosome 6p21.3]
    P1 --> HLA[HLA-Cw6]
    HLA -.->|Drives| Clin[Type I, Early Onset, Guttate]
    
    Minor --> Barrier[Epidermal Barrier Defects]
    Minor --> Immune[Innate Immune Hyperactivity]
    
    Barrier --> P4[PSORS4: LCE Gene Cluster]
    Immune --> P2[PSORS2: CARD14 Mutation]
~~~
*Caption: An exam-ready classification of the PSORS loci, grouped by their biological mechanism of action rather than numerical order.*

### Summary for your Exam Script
To secure top marks in the genetics portion of your pathophysiology answer, frame it as a two-hit genetic model:
1.  **The Primary Driver:** The patient inherits **PSORS1/HLA-Cw6**, giving them the molecular machinery (display trays) to mistakenly present normal skin proteins (LL-37) as dangerous antigens. 
2.  **The Modifiers:** They concurrently inherit minor loci defects, such as a weakened barrier (**PSORS4/LCE**) or a trigger-happy inflammatory signaling system (**PSORS2/CARD14**).

Together, these genetic loci load the spring. But genetics alone is rarely enough to fire the weapon. The disease usually lies dormant until an external force disrupts the skin. In the next section, we will look at the exact environmental triggers—from physical trauma to streptococcus—that pull this genetic trigger.