```mdx
import ReactPlayer from 'react-player'

# Visualizing Tokio Internals: The Journey Begins

This document explores the fundamental concepts behind Tokio's executor, starting with *why* we need systems like Tokio and gradually building up the core components. We'll use descriptions of visualizations to make these ideas concrete.

## Phase 0: The Problem - Why Async? Why Tokio?

Modern applications, especially network services, need to handle many things concurrently. Imagine a web server handling thousands of client connections simultaneously.

A naive approach is to dedicate one Operating System (OS) thread to each connection. Let's see why this doesn't scale well.

### Visualization 1: The Thread-Per-Connection Resource Drain

**Goal:** Show resource consumption (CPU/Memory) and throughput limits of a blocking thread-per-connection model.

**Description:**

Imagine a dashboard resembling `htop` or Task Manager:

1.  **CPU Usage:** Bars representing individual CPU cores.
2.  **Memory Usage:** A single bar showing total RAM consumption.
3.  **Active Threads:** A counter or list showing running OS threads.
4.  **Requests/Second:** A throughput meter.
5.  **Incoming Requests Queue:** A visual queue of pending connections.

**Simulation:**

*   **Start:** The server starts. CPU/Memory usage is low. Throughput is 0. Few base threads exist.
*   **Low Load:** Simulate a few incoming connections (~10). For each, a new OS thread is created.
    *   *Visual:* Active Threads count increases slightly. Memory usage ticks up slightly. CPU usage might blip as threads start but stays relatively low if connections are mostly idle. Throughput matches the request rate.
*   **High Load:** Simulate hundreds or thousands of incoming connections. Many connections involve waiting for network I/O (reading request body, waiting for database, sending response).
    *   *Visual:*
        *   **Active Threads:** The count explodes. Each thread requires kernel resources and its own stack (~MBs).
        *   **Memory Usage:** The Memory bar shoots up dramatically, potentially hitting system limits.
        *   **CPU Usage:** CPU bars likely thrash. Even if threads are mostly *waiting* (blocked on I/O), the OS spends significant time *context switching* between them. This is overhead, not useful work.
        *   **Requests Queue:** The incoming requests queue grows rapidly because threads are created, but many quickly block on I/O. The server struggles to accept new connections.
        *   **Requests/Second:** The throughput meter hits a plateau far below the incoming request rate, possibly even decreasing as context-switching overhead dominates.

```plaintext
[Visualization Placeholder: Animated dashboard showing:]
- Memory bar growing rapidly with increasing thread count.
- CPU bars showing high activity (context switching) even if work isn't done.
- Thread count climbing linearly with connections.
- Throughput leveling off or decreasing under high load.
- Request queue overflowing.
```

---

❓ **Question 1:** If we use traditional blocking threads for each task (like a network connection), what happens when we have thousands of connections?

:::tip Insight
The visualization shows that dedicating an OS thread per connection leads to **resource exhaustion**.
*   **Memory:** Each thread consumes significant memory (stack, kernel structures). Thousands of threads mean Gigabytes of RAM.
*   **CPU:** Excessive context switching between threads burns CPU cycles, even if the threads are mostly idle waiting for I/O.
*   **Limits:** Operating systems have limits on the number of threads that can be created efficiently.

This approach doesn't scale. We need a way to handle many concurrent tasks, especially I/O-bound ones, without needing a dedicated OS thread for each *while it's waiting*.
:::

This leads us to **asynchronous programming**. Rust provides `async fn` and `.await` syntax to write non-blocking code.

---

❓ **Question 2:** Okay, we have `async fn` and `.await` in Rust. How do these functions actually run and make progress? Where do they run?

:::info Answer
`async fn` functions don't run themselves. When called, they return an object implementing the `Future` trait. These `Future`s are *inert* until polled by an **Executor**. An Executor (often part of a larger **Runtime** like Tokio) is responsible for running async tasks, polling their `Future`s, and making progress.
:::

Let's visualize the simplest possible executor.

## Phase 1: The Basic Single-Threaded Executor

**Goal:** Understand the core polling loop and identify its limitations.

**Concept:** The simplest executor has:
1.  A single OS thread (the "Worker").
2.  A collection (like a `VecDeque`) of tasks (`Future`s) that are ready to be polled (the "Ready Queue").

The worker thread runs a loop:
1.  Take a task from the Ready Queue.
2.  Poll the task's `Future`.
3.  Handle the result (`Poll::Ready` or `Poll::Pending`).

### Visualization 2: The Simplest Executor Loop

**Description:**

*   **Layout:**
    *   A box labeled "Worker Thread".
    *   A box labeled "Ready Queue" (e.g., a vertical list).
    *   Tasks represented as circles. Color indicates state: Blue = Ready, Yellow = Running.
*   **Simulation:**
    1.  **Spawn:** A new task (Blue circle) appears in the Ready Queue.
    2.  **Schedule:** The Worker Thread takes the task from the front of the queue. The task circle moves into the Worker Thread box and turns Yellow (Running).
    3.  **Poll:** The task "runs" (e.g., pulses Yellow).
    4.  **Complete:** If `poll` returns `Poll::Ready`, the task finishes (circle disappears). The worker goes back to step 2.
    5.  **Pending (Incorrect Handling - For Q3):** What if `poll` returns `Poll::Pending`?

```plaintext
[Visualization Placeholder: Simple animation showing:]
- A blue circle appearing in the "Ready Queue" box.
- The circle moving into the "Worker Thread" box, turning yellow.
- The circle pulsing yellow (simulating work).
- Scenario 1: The circle disappears (task complete).
- Scenario 2 (Leads to Q3): What happens next if it's not complete?
```

---

❓ **Question 3:** What happens when `poll` returns `Poll::Pending`? Does the task just get put back in the ready queue immediately?

Let's visualize this naive approach.

### Visualization 3: The Busy-Waiting Problem

**Description:**

*   **Layout:** Same as Visualization 2 (Worker, Ready Queue, Task circles). Add a CPU usage indicator for the Worker Thread.
*   **Simulation:**
    1.  A task (Task A, Blue) is in the Ready Queue. Maybe another task (Task B, Blue) is behind it.
    2.  Worker takes Task A. It moves to the Worker box, turns Yellow.
    3.  Worker polls Task A. Imagine it needs to wait for something (but we haven't introduced *how* to wait efficiently yet). `poll` returns `Poll::Pending`.
    4.  **Naive Behavior:** The Worker *immediately* puts Task A back into the Ready Queue (let's say at the end).
    5.  The Worker, being free, immediately checks the Ready Queue. Task B might be there, but if Task A was put back quickly enough (or if the queue was empty before), the worker might pick up Task A *again*.
    6.  Worker polls Task A again. It's still `Pending`. Put it back. Repeat.
*   **Visual Effect:**
    *   Task A shuttles rapidly between the Worker box and the Ready Queue.
    *   The Worker Thread's CPU usage indicator shoots up to 100%.
    *   Crucially, Task B (and any others) in the Ready Queue *never get a chance to run* because the worker is constantly busy polling the same pending task.

```plaintext
[Visualization Placeholder: Animation showing:]
- Task A (Yellow) in Worker, poll returns Pending.
- Task A (Blue) immediately goes back to Ready Queue.
- Worker immediately picks Task A again (turns Yellow).
- Cycle repeats very fast.
- CPU meter for Worker shows 100%.
- Task B remains stuck in the Ready Queue.
```

:::tip Insight
Immediately rescheduling a task that returned `Poll::Pending` leads to **busy-waiting**. The executor spins uselessly, consuming 100% CPU while making no progress on the pending task and starving other ready tasks.

A task returning `Poll::Pending` means it *cannot make progress right now*. It should **yield** control back to the executor and only be polled again when it *might* be able to make progress (e.g., when the I/O it's waiting for is ready). We need a mechanism to wake the task up later.
:::

---

❓ **Question 4:** What if a task needs to wait for something external, like data from a socket? If the task code just calls a traditional *blocking* function (like `std::net::TcpStream::read`), what happens to our single-threaded executor?

### Visualization 4: The Blocking Executor Problem

**Description:**

*   **Layout:** Same basic layout: Worker Thread, Ready Queue, Task circles (Blue=Ready, Yellow=Running). Add a "Blocked" state (Red).
*   **Simulation:**
    1.  Task A (Blue) and Task B (Blue) are in the Ready Queue.
    2.  Worker takes Task A. It moves to the Worker box, turns Yellow.
    3.  Worker polls Task A. Inside the poll, the task's code simulates making a *blocking* I/O call (e.g., `socket.read()`).
    4.  **Blocking Behavior:** The `read()` call *blocks the entire worker thread*.
*   **Visual Effect:**
    *   Task A (in the Worker box) turns Red (Blocked).
    *   Crucially, the *entire* "Worker Thread" box gets a Red overlay or border, indicating the thread itself is blocked.
    *   Time progresses, but nothing happens. The Worker thread is stuck inside the `read()` call.
    *   Task B remains waiting in the Ready Queue indefinitely (or until the blocking call in Task A *finally* returns).
    *   No other tasks can be polled. The entire executor is frozen.

```plaintext
[Visualization Placeholder: Animation showing:]
- Task A (Yellow) in Worker starts a blocking operation.
- Task A turns Red (Blocked).
- The entire "Worker Thread" box turns Red/gets overlayed with "BLOCKED".
- Task B sits idly in the Ready Queue.
- Nothing happens for a noticeable duration (simulating I/O wait).
- Only when the simulated block finishes does Task A potentially complete/yield, and the Worker box becomes active again.
```

:::tip Insight
If a task performs **blocking I/O** on the executor thread, it **blocks the entire executor**. No other tasks can run, completely defeating the purpose of concurrent execution on that thread.

This demonstrates the critical need for:
1.  **Non-Blocking I/O:** Operations that return immediately, indicating whether they are ready or not, without blocking the thread.
2.  **Event Notification:** A mechanism to notify the executor when an I/O resource (like a socket) is ready, so the corresponding task can be woken up and polled again.
:::

This leads us directly to the need for a **Reactor**.

---
