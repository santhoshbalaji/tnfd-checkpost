import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckpostListStore } from '../../services/checkpost-list.store';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  readonly store = inject(CheckpostListStore);
  readonly selectedDate = signal(this.formatDateForInput(new Date()));
  readonly selectedDateLabel = computed(() => {
    const value = this.selectedDate();
    const dateKey = value || this.formatDateForInput(new Date());
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return dateKey;
    }
    return this.dateFormatter.format(date);
  });
  readonly isTotalsLoading = signal(false);
  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long'
  });

  readonly totalVehicles = computed(() => {
    const totalsMap = this.store.totals();
    return this.store.accessibleCheckposts().reduce((acc, cp) => {
      const entry = totalsMap[cp.$id];
      return acc + (entry?.vehicles ?? 0);
    }, 0);
  });

  readonly totalCases = computed(() => {
    const totalsMap = this.store.totals();
    return this.store.accessibleCheckposts().reduce((acc, cp) => {
      const entry = totalsMap[cp.$id];
      return acc + (entry?.cases ?? 0);
    }, 0);
  });

  readonly totalVehiclesPassed = computed(() => {
    const totalsMap = this.store.totals();
    return this.store.accessibleCheckposts().reduce((acc, cp) => {
      const entry = totalsMap[cp.$id];
      return acc + (entry?.passed ?? 0);
    }, 0);
  });

  readonly circleCount = computed(() => this.store.circles().length);

  readonly circleSummaries = computed(() => {
    const totalsMap = this.store.totals();
    return this.store.circles().map(circle => {
      const checkposts = circle.checkposts ?? [];
      const circleTotals = checkposts.reduce(
        (acc, cp) => {
          const entry = totalsMap[cp.$id];
          return {
            vehicles: acc.vehicles + (entry?.vehicles ?? 0),
            cases: acc.cases + (entry?.cases ?? 0),
            passed: acc.passed + (entry?.passed ?? 0)
          };
        },
        { vehicles: 0, cases: 0, passed: 0 }
      );

      return {
        name: circle.name,
        checkposts,
        totals: circleTotals
      };
    });
  });

  async ngOnInit() {
    await this.store.loadCheckposts();
    await this.loadTotalsForSelectedDate();
  }

  onDateChange(value: string) {
    if (!value) {
      return;
    }
    this.selectedDate.set(value);
    void this.loadTotalsForSelectedDate();
  }

  private async loadTotalsForSelectedDate() {
    this.isTotalsLoading.set(true);
    try {
      await this.store.loadTotalsForDate(this.selectedDate());
    } catch (error) {
      console.error('Failed to refresh dashboard totals', error);
    } finally {
      this.isTotalsLoading.set(false);
    }
  }

  private formatDateForInput(date: Date) {
    const offsetMs = date.getTimezoneOffset() * 60000;
    const local = new Date(date.getTime() - offsetMs);
    return local.toISOString().split('T')[0];
  }
}