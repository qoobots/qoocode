/**
 * Parallel Prefetch Service
 * Preloads resources in parallel to improve perceived performance
 */

export interface PrefetchTask {
  id: string;
  url: string;
  priority: 'high' | 'medium' | 'low';
  type: 'document' | 'stylesheet' | 'script' | 'image' | 'fetch';
  options?: RequestInit;
  onProgress?: (loaded: number, total: number) => void;
}

export interface PrefetchOptions {
  maxConcurrent: number;
  maxQueueSize: number;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface PrefetchResult {
  taskId: string;
  success: boolean;
  data?: unknown;
  error?: string;
  duration: number;
}

type PrefetchCallback = (result: PrefetchResult) => void;

export class PrefetchService {
  private options: PrefetchOptions;
  private queue: PrefetchTask[] = [];
  private activeTasks = new Map<string, AbortController>();
  private results = new Map<string, PrefetchResult>();
  private callbacks: Map<string, PrefetchCallback[]> = new Map();
  private running = false;
  private taskCounter = 0;

  constructor(options?: Partial<PrefetchOptions>) {
    this.options = {
      maxConcurrent: 6,
      maxQueueSize: 50,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options
    };
  }

  /**
   * Add a task to the prefetch queue
   */
  public enqueue(task: Omit<PrefetchTask, 'id'>): string {
    if (this.queue.length >= this.options.maxQueueSize) {
      throw new Error('Prefetch queue is full');
    }

    const id = `prefetch_${++this.taskCounter}_${Date.now()}`;
    const fullTask: PrefetchTask = { ...task, id };
    
    // Insert based on priority
    const priorityIndex = task.priority === 'high' ? 0 : 
                          task.priority === 'medium' ? this.queue.filter(t => t.priority === 'high').length :
                          this.queue.length;
    
    this.queue.splice(priorityIndex, 0, fullTask);
    this.processQueue();
    
    return id;
  }

  /**
   * Add multiple tasks at once
   */
  public enqueueBatch(tasks: Omit<PrefetchTask, 'id'>[]): string[] {
    return tasks.map(task => this.enqueue(task));
  }

  /**
   * Register a callback for task completion
   */
  public onComplete(taskId: string, callback: PrefetchCallback): void {
    const callbacks = this.callbacks.get(taskId) || [];
    callbacks.push(callback);
    this.callbacks.set(taskId, callbacks);
  }

  /**
   * Get prefetch result
   */
  public getResult(taskId: string): PrefetchResult | undefined {
    return this.results.get(taskId);
  }

  /**
   * Cancel a prefetch task
   */
  public cancel(taskId: string): boolean {
    const controller = this.activeTasks.get(taskId);
    if (controller) {
      controller.abort();
      this.activeTasks.delete(taskId);
      this.queue = this.queue.filter(t => t.id !== taskId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all prefetch tasks
   */
  public cancelAll(): void {
    this.activeTasks.forEach(controller => controller.abort());
    this.activeTasks.clear();
    this.queue = [];
  }

  /**
   * Get queue status
   */
  public getStatus(): { queued: number; active: number; completed: number } {
    return {
      queued: this.queue.length,
      active: this.activeTasks.size,
      completed: this.results.size
    };
  }

  /**
   * Process the prefetch queue
   */
  private async processQueue(): Promise<void> {
    if (this.running) return;
    this.running = true;

    while (this.queue.length > 0 && this.activeTasks.size < this.options.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.executeTask(task);
      }
    }

    this.running = false;
  }

  /**
   * Execute a prefetch task with retry logic
   */
  private async executeTask(task: PrefetchTask): Promise<void> {
    const controller = new AbortController();
    this.activeTasks.set(task.id, controller);

    let lastError: Error | null = null;
    const startTime = Date.now();

    for (let attempt = 0; attempt <= this.options.retryAttempts; attempt++) {
      if (controller.signal.aborted) {
        this.activeTasks.delete(task.id);
        return;
      }

      try {
        const data = await this.fetchWithTimeout(task, controller.signal);
        const duration = Date.now() - startTime;

        const result: PrefetchResult = {
          taskId: task.id,
          success: true,
          data,
          duration
        };

        this.results.set(task.id, result);
        this.notifyCallbacks(task.id, result);
        this.activeTasks.delete(task.id);
        this.processQueue();
        return;
      } catch (error) {
        lastError = error as Error;
        
        if (controller.signal.aborted) {
          this.activeTasks.delete(task.id);
          return;
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.options.retryAttempts) {
          await this.delay(this.options.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    const result: PrefetchResult = {
      taskId: task.id,
      success: false,
      error: lastError?.message || 'Unknown error',
      duration
    };

    this.results.set(task.id, result);
    this.notifyCallbacks(task.id, result);
    this.activeTasks.delete(task.id);
    this.processQueue();
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(task: PrefetchTask, signal: AbortSignal): Promise<unknown> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error('Prefetch timeout')), this.options.timeout);
      signal.addEventListener('abort', () => clearTimeout(timer));
    });

    const fetchPromise = this.performFetch(task);

    return Promise.race([fetchPromise, timeoutPromise]);
  }

  /**
   * Perform the actual fetch
   */
  private async performFetch(task: PrefetchTask): Promise<unknown> {
    const controller = this.activeTasks.get(task.id);
    if (!controller) throw new Error('Task cancelled');

    if (task.type === 'fetch') {
      const response = await fetch(task.url, {
        ...task.options,
        signal: controller.signal
      });
      return response.json();
    }

    // For document, stylesheet, script, image - just load the resource
    if (task.type === 'document' || task.type === 'stylesheet' || task.type === 'script') {
      return this.loadLinkResource(task, controller.signal);
    }

    if (task.type === 'image') {
      return this.loadImage(task, controller.signal);
    }

    throw new Error(`Unknown prefetch type: ${task.type}`);
  }

  /**
   * Load a link resource (CSS, JS, HTML)
   */
  private loadLinkResource(task: PrefetchTask, signal: AbortSignal): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const element = task.type === 'script' 
        ? document.createElement('link')
        : document.createElement('link');
      
      element.rel = task.type === 'document' ? 'preload' : 'prefetch';
      if (task.type !== 'document') {
        element.as = task.type;
      }
      element.href = task.url;

      element.onload = () => resolve({ loaded: true });
      element.onerror = () => reject(new Error(`Failed to load: ${task.url}`));

      signal.addEventListener('abort', () => {
        element.remove();
        reject(new Error('Cancelled'));
      });

      document.head.appendChild(element);
    });
  }

  /**
   * Load an image
   */
  private loadImage(task: PrefetchTask, signal: AbortSignal): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve({ loaded: true, width: img.width, height: img.height });
      img.onerror = () => reject(new Error(`Failed to load image: ${task.url}`));

      signal.addEventListener('abort', () => {
        img.src = '';
        reject(new Error('Cancelled'));
      });

      img.src = task.url;
    });
  }

  /**
   * Notify callbacks of task completion
   */
  private notifyCallbacks(taskId: string, result: PrefetchResult): void {
    const callbacks = this.callbacks.get(taskId);
    if (callbacks) {
      callbacks.forEach(cb => cb(result));
      this.callbacks.delete(taskId);
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear completed results
   */
  public clearResults(): void {
    this.results.clear();
  }

  /**
   * Dispose the service
   */
  public dispose(): void {
    this.cancelAll();
    this.clearResults();
    this.callbacks.clear();
  }
}

// Singleton instance
let prefetchServiceInstance: PrefetchService | null = null;

export function getPrefetchService(options?: Partial<PrefetchOptions>): PrefetchService {
  if (!prefetchServiceInstance) {
    prefetchServiceInstance = new PrefetchService(options);
  }
  return prefetchServiceInstance;
}
