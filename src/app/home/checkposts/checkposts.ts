import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckpostsListComponent } from '../checkposts-list/checkposts-list';

@Component({
  selector: 'app-checkposts',
  standalone: true,
  imports: [CommonModule, CheckpostsListComponent],
  templateUrl: './checkposts.html',
  styleUrls: ['./checkposts.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostsPage {}
