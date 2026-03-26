## Diagram: 1.1 The Request Lifecycle & Proxy Topography

This diagram illustrates the path of a request from the initial DNS resolution through the transport of IP packets, highlighting the distinct positions of Forward and Reverse proxies.

```text
  CLIENT SIDE                    INTERNET                     SERVER SIDE
 ╔══════════╗          (1) DNS Query         ┌───────────┐
 ║  Browser ║ ──────────────────────────────>│ DNS Root  │
 ╚══════════╝ <──────────────────────────────│ Server    │
      │        (2) Returns IP (1.2.3.4)      └───────────┘
      │
      ▼         (3) IP Packet Construction
 ┌──────────┐   ┌─────────────────────────────────────────┐
 │ Forward  │   │ IP Header: Src[10.0.0.1] Dest[1.2.3.4]  │
 │  Proxy   │──>│ TCP Segment: Port 443                   │
 └──────────┘   │ Payload: GET /index.html HTTP/1.1       │
   (Hides       └─────────────────────────────────────────┘
    Client)                  │
                             │ (4) Routing across networks
                             ▼
                        ┌───────────┐         ╔═══════════════════════╗
                        │  Reverse  │         ║    Internal Network   ║
                        │   Proxy   │────────>║ ┌──────┐┌──────┐┌──────┐
                        └───────────┘         ║ │ Srv1 ││ Srv2 ││ Srv3 │
                          (Hides              ║ └──────┘└──────┘└──────┘
                           Servers)           ╚═══════════════════════╝
```

**Caption:** The request begins with a DNS lookup to map a domain to an IP. Data is then encapsulated into IP Packets. A **Forward Proxy** sits in front of clients to provide anonymity or filtering, while a **Reverse Proxy** sits in front of servers to handle load balancing and security.

***

## Diagram: 1.2 Vertical vs. Horizontal Scaling

This comparison visualizes the fundamental difference between increasing the capacity of a single node (Vertical) versus increasing the number of nodes (Horizontal).

```text
   VERTICAL SCALING (Scale Up)             HORIZONTAL SCALING (Scale Out)
  ═════════════════════════════           ═════════════════════════════════

      [ LIMIT ]  ◄── Resource Ceiling           (Add nodes indefinitely)
          ▲                                    ┌───┐   ┌───┐   ┌───┐
  ┌───────╨───────┐                            │   │   │   │   │   │
  │               │      Adding:               └───┘   └───┘   └───┘
  │    SERVER     │      ● RAM                   ▲       ▲       ▲
  │               │      ● CPU             ──────┴───────┴───────┴──────
  │ (More Power)  │      ● Disk            Load Balancer / Traffic Dist.
  └───────────────┘                        ─────────────────────────────

   PROS:                                   PROS:
   ✓ Simple (No code changes)              ✓ High Availability
   ✓ Low network overhead                  ✓ No hard resource ceiling

   CONS:                                   CONS:
   ✗ Hard hardware limit                   ✗ Requires Statelessness
   ✗ Single point of failure               ✗ Complex network/deployment
```

**Caption:** **Vertical Scaling** is limited by the "Resource Ceiling" of a single machine. **Horizontal Scaling** requires **Statelessness** (where any server can handle any request) to allow traffic to be distributed across an arbitrary number of identical machines.

***

## Diagram: 1.3 Load Balancing Tier (L4 vs. L7)

This diagram breaks down the Load Balancer (LB) tier by showing how different layers of the OSI model affect routing decisions and which algorithms are used to distribute load.

```text
  TRAFFIC SOURCE (Internet)
          │
          ▼
  ╔══════════════════════════════════════════════════════════════════════╗
  ║                 LOAD BALANCING DECISION ENGINE                       ║
  ╠══════════════════════════════════╦═══════════════════════════════════╣
  ║    LAYER 4 (Transport)           ║     LAYER 7 (Application)         ║
  ╟──────────────────────────────────╫───────────────────────────────────╢
  ║ ● Inspects: IP, Port, TCP        ║ ● Inspects: HTTP Headers, Cookies ║
  ║ ● Faster: No packet decryption   ║ ● Smarter: Content-aware routing  ║
  ║ ● Simple: Blind to application   ║ ● Slower: Must decrypt SSL/TLS    ║
  ╚══════════════════════════════════╩═══════════════════════════════════╝
          │
          ├─▸ [ ALGORITHM SELECTION ]
          │   ───────────────────────
          │   ● ROUND ROBIN: Sequential distribution (1, 2, 3, 1...)
          │   ● LEAST CONNS: Sends to server with fewest active jobs
          │   ● IP HASH: Maps Client IP to specific server (Sticky)
          ▼
  ┌───────────────┐        ┌───────────────┐        ┌───────────────┐
  │   Server A    │        │   Server B    │        │   Server C    │
  └───────────────┘        └───────────────┘        └───────────────┘
```

**Caption:** **L4 Load Balancers** make fast decisions based on network data (IP/Port). **L7 Load Balancers** make complex decisions based on application data (URLs/Cookies). Common algorithms like **Round Robin** provide simple rotation, while **IP Hash** ensures a user stays connected to the same backend server.