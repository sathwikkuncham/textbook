# Topic 31 · Variant C — Voice + Rigor + Source Primacy

**Topic:** Psoriasis Pathophysiology: A 10-Mark Answer
**Module:** Etiology: Genetics and Environmental Triggers
**Subtopic:** Primary Genetic Determinants: PSORS Loci and HLA-Cw6
**Concepts:** PSORS1 locus and HLA-Cw6 association, Non-PSORS loci (PSORS2-9)
**Learner profile:** Advanced · PG exam 10-mark · Molecular depth · 4 months
**Latency:** 31380ms
**Word count:** 801

---

To score perfectly on a 10-mark pathophysiology question in your PG exam, your answer needs a logical, undeniable flow. Examiners are looking for a narrative that moves from **Predisposition** to **Trigger** to **Mechanism**. 

Because you have four months to master this, we aren't just going to memorize a list of genes. We are going to build the molecular rationale for *why* these genes cause the disease. When you understand the "why," the flowcharts you draw in the exam hall will be second nature.

We start at the absolute foundation of the psoriatic cascade: Genetic Susceptibility. 

### 1. The Heavyweight: PSORS1 and the HLA-Cw6 Allele

Psoriasis is polygenic, meaning it requires a "perfect storm" of multiple genetic variants to prime the skin for disease. However, not all genetic loci carry the same weight. The undisputed heavyweight champion of psoriasis genetics is the **PSORS1** locus. 

Located on chromosome **6p21.3** right inside the Major Histocompatibility Complex (MHC) region, PSORS1 alone accounts for a massive **35% to 50% of the heritable risk** for psoriasis.

But "PSORS1" is just an address on a chromosome. The actual driver of the disease living at this address is the **HLA-Cw6** allele (officially typed as HLA-C*06:02).

**Why does HLA-Cw6 matter clinically?**
In your exam script, you must correlate this allele with the clinical phenotype. HLA-Cw6 positivity is the defining marker for **Type I Psoriasis** (early-onset, usually before age 40). Patients with this allele have a more severe disease course, highly positive Koebner phenomenon, and are uniquely primed for guttate psoriasis flares following streptococcal throat infections.

**Why does HLA-Cw6 matter molecularly?**
To show the examiner you are thinking at a postgraduate level, you need to explain what HLA-Cw6 actually *does*. 

HLA molecules are presentation trays. HLA-Cw6 is an MHC Class I molecule, which means its job is to present antigens to **CD8+ T cells** (cytotoxic T cells). In a healthy patient, this system fights viruses. In a psoriasis patient, the HLA-Cw6 "tray" has a dangerously high affinity for specific *autoantigens* (self-proteins) found in the skin. 

The two highest-yield autoantigens to mention in your exam are:
1.  **LL-37 (Cathelicidin):** An antimicrobial peptide overproduced by stressed keratinocytes.
2.  **ADAMTSL5:** A protein produced by melanocytes.

When HLA-Cw6 presents LL-37 or ADAMTSL5 to CD8+ T cells, the immune system mistakenly identifies the skin as a threat, triggering the initial spark of the inflammatory cascade.

~~~mermaid
graph TD
    A[Stressed Skin / Keratinocytes] -->|Releases| B(Autoantigen: LL-37)
    C[Melanocytes] -->|Releases| D(Autoantigen: ADAMTSL5)
    B --> E{HLA-Cw6 on Antigen Presenting Cell}
    D --> E
    E -->|Presents antigen to| F[CD8+ T-cell Activation]
    F --> G[Initiation of Psoriatic Inflammatory Cascade]
~~~
*Caption: The molecular mechanism of the PSORS1 locus. HLA-Cw6 drives disease by improperly presenting skin autoantigens to cytotoxic T cells.*

### 2. The Polygenic Background: Non-PSORS Loci (PSORS2–9)

While PSORS1 provides the main immunologic spark, the rest of the genetic risk is scattered across several other chromosomes. These are the **Non-PSORS1 loci** (PSORS2 through PSORS9). 

For a 10-mark answer, you do not need to write a textbook paragraph on all eight of these. Instead, grouping them by their functional disruption shows mastery. You should list them, but explicitly highlight **PSORS2** and **PSORS4**, as they represent the two distinct arms of psoriasis pathology: innate immune signaling and skin barrier defects.

**The High-Yield Minor Loci:**

*   **PSORS2 (Chromosome 17q25) — The Inflammatory Amplifier:**
    This locus houses the **CARD14** gene. CARD14 is an epidermal scaffolding protein that turns on NF-κB, a master regulator of inflammation. Mutations here lead to hyperactive NF-κB signaling in keratinocytes. *Clinical correlation:* CARD14 mutations are heavily implicated in pustular psoriasis and familial pityriasis rubra pilaris (PRP).
*   **PSORS4 (Chromosome 1q21) — The Barrier Defect:**
    This locus contains the **Epidermal Differentiation Complex (EDC)**. Specifically, deletions in the **LCE (Late Cornified Envelope)** gene cluster (LCE3B/LCE3C) live here. If the stratum corneum barrier is genetically compromised, external environmental triggers (like trauma or microbes) can easily penetrate and trigger the immune system.

**The Supporting Cast:**
To complete the framework in your exam script, you can briefly list the remaining mapped loci to demonstrate comprehensive knowledge:
*   **PSORS3** (4q34)
*   **PSORS5** (3q21)
*   **PSORS6** (19p13)
*   **PSORS7** (1p)
*   **PSORS8** (16q)
*   **PSORS9** (4q31)

### 3. Exam Strategy: How to Write This

When you begin your 10-mark answer, your "Heading 1" will be **Genetic Susceptibility**. 

Under this heading, you will structure your thoughts exactly like this:
1.  **Major Locus:** State PSORS1 (6p21.3) and its 35-50% risk contribution.
2.  **Key Allele:** Name HLA-Cw6, its clinical link (Type I, guttate, Koebner), and its molecular mechanism (presenting LL-37/ADAMTSL5 to CD8+ cells).
3.  **Minor Loci:** Provide a bulleted list of PSORS2-9, making sure to define PSORS2 (CARD14 / NF-κB) and PSORS4 (EDC / LCE genes / Barrier).

By laying this genetic groundwork, you have just explained *why* the patient is predisposed. But genetics alone don't cause the plaques; they just load the gun. 

To fire it, we need immune pathways and environmental triggers. We will tackle the specific immune gene polymorphisms (like IL23R and TNFAIP3) that prime the Th17 pathway in the next section, building directly on this foundation.