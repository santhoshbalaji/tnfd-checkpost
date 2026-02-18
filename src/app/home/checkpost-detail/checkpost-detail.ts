import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CheckpostService, CheckpostData } from '../../services/checkpost.service';
import { ButtonModule } from 'primeng/button';

interface CheckpostWithId extends CheckpostData {
  $id: string;
}

@Component({
  selector: 'app-checkpost-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './checkpost-detail.html',
  styleUrls: ['./checkpost-detail.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkpostService = inject(CheckpostService);

  readonly checkpost = signal<CheckpostWithId | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadCheckpost(id);
    } else {
      this.error.set('No checkpost ID provided');
      this.isLoading.set(false);
    }
  }

  async loadCheckpost(id: string) {
    this.isLoading.set(true);
    try {
      const data = await this.checkpostService.getCheckpost(id);
      this.checkpost.set(data as unknown as CheckpostWithId);
    } catch (err) {
      console.error('Failed to load checkpost', err);
      this.error.set('Failed to load checkpost details. Please try again later.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
