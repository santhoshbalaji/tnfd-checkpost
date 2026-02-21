import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckpostListStore } from '../../services/checkpost-list.store';
import { formatDateForIstInput } from '../../utils/date-helpers';

@Component({
  selector: 'app-checkposts-date-filter',
  imports: [CommonModule],
  templateUrl: './checkposts-date-filter.html',
  styleUrls: ['./checkposts-date-filter.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostsDateFilterComponent implements OnInit {
  readonly store = inject(CheckpostListStore);
  readonly selectedDate = signal(this.formatDateForInput(new Date()));
  readonly isTotalsLoading = signal(false);
  readonly todayValue = this.formatDateForInput(new Date());
  private readonly dateFormatter = new Intl.DateTimeFormat('en-IN', { dateStyle: 'long' });

  readonly selectedDateLabel = computed(() => {
    const value = this.selectedDate();
    const dateKey = value || this.formatDateForInput(new Date());
    const date = new Date(`${dateKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return 'the selected date';
    }
    return this.dateFormatter.format(date);
  });

  async ngOnInit() {
    await this.loadTotalsForDate(this.selectedDate());
  }

  async onDateChange(value: string) {
    if (!value) {
      return;
    }
    this.selectedDate.set(value);
    await this.loadTotalsForDate(value);
  }

  private async loadTotalsForDate(dateValue: string) {
    this.isTotalsLoading.set(true);
    try {
      await this.store.loadTotalsForDate(dateValue);
    } catch (error) {
      console.error('Failed to refresh checkpost totals for date', error);
    } finally {
      this.isTotalsLoading.set(false);
    }
  }

  private formatDateForInput(date: Date) {
    return formatDateForIstInput(date);
  }
}
