import { Injectable, inject, signal, computed } from '@angular/core';
import { CheckpostData, CheckpostService } from './checkpost.service';

interface CheckpostWithId extends CheckpostData {
  $id: string;
}

interface CircleGroup {
  name: string;
  checkposts: CheckpostWithId[];
}

@Injectable({
  providedIn: 'root'
})
export class CheckpostListStore {
  private readonly checkpostService = inject(CheckpostService);

  readonly checkposts = signal<CheckpostWithId[]>([]);
  readonly isLoading = signal(false);
  readonly hasLoaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  readonly circles = computed(() => {
    const groups: Record<string, CheckpostWithId[]> = {};
    this.checkposts().forEach(cp => {
      const circle = cp.circle || 'Unassigned';
      if (!groups[circle]) {
        groups[circle] = [];
      }
      groups[circle].push(cp);
    });

    return Object.keys(groups)
      .map(name => ({
        name,
        checkposts: groups[name]
      } as CircleGroup))
      .sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly totalCheckposts = computed(() => this.checkposts().length);

  async loadCheckposts() {
    if (this.hasLoaded()) {
      return;
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = (async () => {
      this.isLoading.set(true);
      try {
        const response = await this.checkpostService.getCheckposts();
        this.checkposts.set(response.documents as unknown as CheckpostWithId[]);
        this.hasLoaded.set(true);
      } catch (error) {
        console.error('Failed to load checkposts', error);
      } finally {
        this.isLoading.set(false);
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }
}
