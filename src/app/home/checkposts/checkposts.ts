import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CheckpostsDateFilterComponent } from '../checkposts-date-filter/checkposts-date-filter';
import { CheckpostsListComponent } from '../checkposts-list/checkposts-list';

@Component({
  selector: 'app-checkposts',
  standalone: true,
  imports: [CommonModule, CheckpostsDateFilterComponent, CheckpostsListComponent],
  templateUrl: './checkposts.html',
  styleUrls: ['./checkposts.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostsPage {}
