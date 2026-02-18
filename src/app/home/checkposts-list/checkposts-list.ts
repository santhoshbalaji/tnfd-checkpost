import { Component, OnInit, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckpostListStore } from '../../services/checkpost-list.store';

@Component({
  selector: 'app-checkposts-list',
  standalone: true,
  imports: [CommonModule, RouterLink, ButtonModule],
  templateUrl: './checkposts-list.html',
  styleUrls: ['./checkposts-list.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostsListComponent implements OnInit {
  readonly store = inject(CheckpostListStore);

  async ngOnInit() {
    await this.store.loadCheckposts();
  }
}
