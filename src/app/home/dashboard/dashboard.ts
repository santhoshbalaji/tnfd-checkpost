import { Component, ChangeDetectionStrategy, computed, inject, OnInit } from '@angular/core';
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
            cases: acc.cases + (entry?.cases ?? 0)
          };
        },
        { vehicles: 0, cases: 0 }
      );

      return {
        name: circle.name,
        checkposts,
        totals: circleTotals
      };
    });
  });

  ngOnInit() {
    void this.store.loadCheckposts();
  }
}