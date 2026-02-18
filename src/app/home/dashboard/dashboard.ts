import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CheckpostService, CheckpostData } from '../../services/checkpost.service';
import { ButtonModule } from 'primeng/button';

interface CheckpostWithId extends CheckpostData {
  $id: string;
}

interface CircleGroup {
  name: string;
  checkposts: CheckpostWithId[];
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {
  private readonly checkpostService = inject(CheckpostService);

  readonly checkposts = signal<CheckpostWithId[]>([]);
  readonly isLoading = signal(false);

  readonly circles = computed(() => {
    const groups: { [key: string]: CheckpostWithId[] } = {};
    this.checkposts().forEach(cp => {
      const circle = cp.circle || 'Unassigned';
      if (!groups[circle]) {
        groups[circle] = [];
      }
      groups[circle].push(cp);
    });

    return Object.keys(groups).map(name => ({
      name,
      checkposts: groups[name]
    } as CircleGroup)).sort((a, b) => a.name.localeCompare(b.name));
  });

  readonly totalCheckposts = computed(() => this.checkposts().length);

  async ngOnInit() {
    await this.loadCheckposts();
  }

  async loadCheckposts() {
    this.isLoading.set(true);
    try {
      const response = await this.checkpostService.getCheckposts();
      this.checkposts.set(response.documents as unknown as CheckpostWithId[]);
    } catch (error) {
      console.error('Failed to load checkposts', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}
