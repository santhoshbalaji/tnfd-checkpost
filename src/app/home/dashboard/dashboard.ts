import { Component, ChangeDetectionStrategy, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckpostListStore } from '../../services/checkpost-list.store';
import { formatDateForIstInput } from '../../utils/date-helpers';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  readonly store = inject(CheckpostListStore);
  readonly selectedDate = signal(this.formatDateForInput(new Date()));
  readonly selectedYear = signal(new Date().getFullYear());
  readonly selectedMonth = signal(new Date().getMonth() + 1);
  readonly activeFilter = signal<'year' | 'month' | 'date'>('date');
  readonly activeFilterLabel = computed(() => {
    const map: Record<'year' | 'month' | 'date', string> = {
      year: 'Year',
      month: 'Month',
      date: 'Date'
    };
    return `${map[this.activeFilter()]} filter enabled`;
  });
  readonly selectedDateLabel = computed(() => {
    const value = this.selectedDate();
    const dateKey = value || this.formatDateForInput(new Date());
    if (this.activeFilter() === 'month') {
      const monthLabel = this.monthNames[this.selectedMonth() - 1] ?? 'Unknown';
      return `${monthLabel} ${this.selectedYear()}`;
    }
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
  private readonly monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  readonly availableYears = computed(() => {
    const dates = this.store.availableLogDates();
    const years = new Set<number>();
    dates.forEach(dateKey => {
      const parts = this.getDateParts(dateKey);
      if (parts) {
        years.add(parts.year);
      }
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  });

  readonly availableMonths = computed(() => {
    const year = this.selectedYear();
    if (!year) {
      return [];
    }
    const months = new Set<number>();
    this.store.availableLogDates().forEach(dateKey => {
      const parts = this.getDateParts(dateKey);
      if (parts && parts.year === year) {
        months.add(parts.month);
      }
    });
    return Array.from(months)
      .sort((a, b) => b - a)
      .map(month => ({
        value: month,
        label: this.monthNames[month - 1]
      }));
  });

  readonly availableDatesForSelection = computed(() => {
    const year = this.selectedYear();
    const month = this.selectedMonth();
    if (!year || !month) {
      return [];
    }
    return this.store.availableLogDates().filter(dateKey => {
      const parts = this.getDateParts(dateKey);
      return parts && parts.year === year && parts.month === month;
    });
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
    await this.store.ensureLogDatesLoaded();
    const todayKey = this.formatDateForInput(new Date());
    await this.setDateAndLoad(todayKey);
  }

  async onDateChange(value: string) {
    if (!value) {
      return;
    }
    await this.setDateAndLoad(value);
  }

  async onYearChange(value: string, force = false) {
    const year = Number(value);
    if (!year || (!force && this.selectedYear() === year)) {
      return;
    }
    this.selectedYear.set(year);
    if (this.activeFilter() === 'year') {
      await this.refreshTotals();
    }
  }

  async onMonthChange(value: string, force = false) {
    const month = Number(value);
    if (!month || (!force && this.selectedMonth() === month)) {
      return;
    }
    this.selectedMonth.set(month);
    if (this.activeFilter() === 'month') {
      await this.refreshTotals();
    }
  }

  setActiveFilter(filter: 'year' | 'month' | 'date') {
    this.activeFilter.set(filter);
    switch (filter) {
      case 'year': {
        const currentYear = new Date().getFullYear();
        const years = this.availableYears();
        const targetYear = years.includes(currentYear)
          ? currentYear
          : years[0] ?? currentYear;
        if (targetYear) {
          void this.onYearChange(String(targetYear), true);
        }
        break;
      }
      case 'month': {
        const months = this.availableMonths();
        const current = this.selectedMonth();
        const targetMonth = months.find(m => m.value === current)?.value || months[0]?.value;
        if (targetMonth) {
          void this.onMonthChange(String(targetMonth), true);
        }
        break;
      }
      case 'date': {
        const todayKey = this.formatDateForInput(new Date());
        void this.onDateChange(todayKey);
        break;
      }
    }
  }

  private async setDateAndLoad(dateKey: string) {
    this.selectedDate.set(dateKey);
    this.syncYearMonthFromDate(dateKey);
    await this.refreshTotals();
  }

  private syncYearMonthFromDate(dateKey: string) {
    const parts = this.getDateParts(dateKey);
    if (!parts) {
      return;
    }
    if (this.selectedYear() !== parts.year) {
      this.selectedYear.set(parts.year);
    }
    if (this.selectedMonth() !== parts.month) {
      this.selectedMonth.set(parts.month);
    }
  }

  private getDateParts(dateKey: string) {
    if (!dateKey) {
      return null;
    }
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate()
    };
  }

  private async refreshTotals() {
    this.isTotalsLoading.set(true);
    try {
      const filter = this.activeFilter();
      if (filter === 'year') {
        await this.store.loadTotalsForYear(this.selectedYear());
      } else if (filter === 'month') {
        await this.store.loadTotalsForMonth(this.selectedYear(), this.selectedMonth());
      } else {
        await this.store.loadTotalsForDate(this.selectedDate());
      }
    } catch (error) {
      console.error('Failed to refresh dashboard totals', error);
    } finally {
      this.isTotalsLoading.set(false);
    }
  }

  private formatDateForInput(date: Date) {
    return formatDateForIstInput(date);
  }
}
