import { Injectable, inject, signal, computed } from '@angular/core';
import { AppwriteAuthService } from './appwrite-auth.service';
import { CheckpostData, CheckpostService } from './checkpost.service';

interface CheckpostWithId extends CheckpostData {
  $id: string;
}

interface CircleGroup {
  name: string;
  checkposts: CheckpostWithId[];
}

interface CheckpostTotals {
  vehicles: number;
  cases: number;
  passed: number;
}

@Injectable({
  providedIn: 'root'
})
export class CheckpostListStore {
  private readonly checkpostService = inject(CheckpostService);
  private readonly auth = inject(AppwriteAuthService);

  readonly checkposts = signal<CheckpostWithId[]>([]);
  readonly isLoading = signal(false);
  readonly hasLoaded = signal(false);
  private loadPromise: Promise<void> | null = null;

  readonly accessibleCheckposts = computed(() => {
    if (this.auth.isAdmin()) {
      return this.checkposts();
    }

    const allowedCircles = this.auth.circleLabels();
    if (!allowedCircles.length) {
      return [];
    }

    const normalizedAllowed = new Set<string>(
      allowedCircles.map(label => label.toLowerCase())
    );

    return this.checkposts().filter(cp => {
      const circleName = (cp.circle ?? '').trim();
      if (!circleName) {
        return false;
      }
      return normalizedAllowed.has(circleName.toLowerCase());
    });
  });

  readonly circles = computed(() => {
    const groups: Record<string, CheckpostWithId[]> = {};
    this.accessibleCheckposts().forEach(cp => {
      const trimmed = (cp.circle ?? '').trim();
      const circle = trimmed || 'Unassigned';
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

  readonly totalCheckposts = computed(() => this.accessibleCheckposts().length);
  readonly totals = signal<Record<string, CheckpostTotals>>({});
  readonly totalsDate = signal('');

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
        const loaded = response.documents as unknown as CheckpostWithId[];
        this.checkposts.set(loaded);
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

  async loadTotalsForDate(dateValue: string | Date) {
    const dateKey = this.formatDateKey(dateValue);
    if (!dateKey) {
      this.totals.set({});
      this.totalsDate.set('');
      return;
    }

    if (!this.hasLoaded()) {
      await this.loadCheckposts();
    }

    const checkposts = this.accessibleCheckposts();
    if (!checkposts.length) {
      this.totals.set({});
      this.totalsDate.set(dateKey);
      return;
    }

    this.totals.set({});
    try {
      const isoDate = this.toIsoDate(dateKey);
      const entries = await Promise.all(
        checkposts.map(async cp => {
          try {
            const logs = await this.checkpostService.getDailyLogsForDate(cp.$id, isoDate);
            const summary = (logs.documents as Array<any>).reduce(
              (acc, log) => ({
                vehicles: acc.vehicles + (Number(log.vehiclesCheckedCount) || 0),
                cases: acc.cases + (Number(log.casesRegisteredCount) || 0),
                passed: acc.passed + (Number(log.vehiclesPassedCount) || 0)
              }),
              { vehicles: 0, cases: 0, passed: 0 }
            );
            return { id: cp.$id, ...summary };
          } catch (error) {
            console.error(`Failed to load stats for ${cp.$id} on ${dateKey}`, error);
            return { id: cp.$id, vehicles: 0, cases: 0, passed: 0 };
          }
        })
      );

      const statsMap: Record<string, CheckpostTotals> = {};
      entries.forEach(entry => {
        statsMap[entry.id] = {
          vehicles: entry.vehicles,
          cases: entry.cases,
          passed: entry.passed
        };
      });

      this.totals.set(statsMap);
      this.totalsDate.set(dateKey);
    } catch (error) {
      console.error('Failed to compute daily totals', error);
      this.totals.set({});
      this.totalsDate.set(dateKey);
    }
  }

  private formatDateKey(dateValue: string | Date) {
    if (!dateValue) {
      return '';
    }
    const parsed = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }
    const offsetMs = parsed.getTimezoneOffset() * 60000;
    const local = new Date(parsed.getTime() - offsetMs);
    return local.toISOString().split('T')[0];
  }

  private toIsoDate(dateKey: string) {
    if (!dateKey) {
      return '';
    }
    return new Date(`${dateKey}T00:00:00`).toISOString();
  }
}
