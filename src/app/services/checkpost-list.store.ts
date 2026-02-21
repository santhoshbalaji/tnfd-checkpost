import { Injectable, inject, signal, computed } from '@angular/core';
import { AppwriteAuthService } from './appwrite-auth.service';
import { CheckpostData, CheckpostService } from './checkpost.service';
import { toIstDateKey, toIstIsoDate, toIstMonthRange, toIstYearRange } from '../utils/date-helpers';

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
  readonly availableLogDates = signal<string[]>([]);
  private logDatesPromise: Promise<void> | null = null;

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

  async loadTotalsForMonth(year: number, month: number) {
    if (!year || !month || month < 1 || month > 12) {
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
      this.totalsDate.set(`${year}-${String(month).padStart(2, '0')}`);
      return;
    }

    this.totals.set({});
    const range = toIstMonthRange(year, month);
    if (!range.startIso || !range.endIso) {
      this.totalsDate.set(`${year}-${String(month).padStart(2, '0')}`);
      return;
    }
    try {
      const entries = await Promise.all(
        checkposts.map(async cp => {
          try {
            const logs = await this.checkpostService.getDailyLogsForRange(cp.$id, range.startIso, range.endIso);
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
            console.error(`Failed to load stats for ${cp.$id} in ${year}-${month}`, error);
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
      this.totalsDate.set(`${year}-${String(month).padStart(2, '0')}`);
    } catch (error) {
      console.error('Failed to compute monthly totals', error);
      this.totals.set({});
      this.totalsDate.set(`${year}-${String(month).padStart(2, '0')}`);
    }
  }

  async loadTotalsForYear(year: number) {
    if (!year || year < 1) {
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
      this.totalsDate.set(String(year));
      return;
    }

    this.totals.set({});
    const range = toIstYearRange(year);
    if (!range.startIso || !range.endIso) {
      this.totalsDate.set(String(year));
      return;
    }
    try {
      const entries = await Promise.all(
        checkposts.map(async cp => {
          try {
            const logs = await this.checkpostService.getDailyLogsForRange(
              cp.$id,
              range.startIso,
              range.endIso
            );
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
            console.error(`Failed to load stats for ${cp.$id} in ${year}`, error);
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
      this.totalsDate.set(String(year));
    } catch (error) {
      console.error('Failed to compute yearly totals', error);
      this.totals.set({});
      this.totalsDate.set(String(year));
    }
  }

  async ensureLogDatesLoaded() {
    if (this.logDatesPromise) {
      return this.logDatesPromise;
    }

    this.logDatesPromise = (async () => {
      try {
        const checkposts = this.accessibleCheckposts();
        if (!checkposts.length) {
          this.availableLogDates.set([]);
          return;
        }

        const dateSet = new Set<string>();

        await Promise.all(
          checkposts.map(async cp => {
            try {
              const response = await this.checkpostService.getDailyLogs(cp.$id);
              const logs = response.documents as Array<{ logDate?: string }>;
              logs.forEach(log => {
                const dateKey = this.formatDateKey(log.logDate ?? '');
                if (dateKey) {
                  dateSet.add(dateKey);
                }
              });
            } catch (error) {
              console.error(`Failed to load log dates for ${cp.$id}`, error);
            }
          })
        );

        const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));
        this.availableLogDates.set(sortedDates);
      } catch (error) {
        console.error('Failed to load available log dates', error);
        this.availableLogDates.set([]);
      } finally {
        this.logDatesPromise = null;
      }
    })();

    return this.logDatesPromise;
  }

  private formatDateKey(dateValue: string | Date) {
    return toIstDateKey(dateValue);
  }

  private toIsoDate(dateKey: string) {
    return toIstIsoDate(dateKey);
  }
}
