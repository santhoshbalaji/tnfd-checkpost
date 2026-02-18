import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CheckpostService, CheckpostData } from '../../services/checkpost.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

interface CheckpostWithId extends CheckpostData {
  $id: string;
  $createdAt: string;
}

@Component({
  selector: 'app-checkpost-detail',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    ButtonModule, 
    ReactiveFormsModule, 
    InputTextModule, 
    TableModule, 
    DialogModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './checkpost-detail.html',
  styleUrls: ['./checkpost-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CheckpostDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkpostService = inject(CheckpostService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  readonly checkpost = signal<CheckpostWithId | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal<string | null>(null);
  readonly today = new Date();
  
  readonly dailyLogs = signal<any[]>([]);
  readonly isLogModalVisible = signal(false);
  readonly isSavingLog = signal(false);

  logForm: FormGroup = this.fb.group({
    vehiclesCheckedCount: [0, [Validators.required, Validators.min(0)]],
    casesRegisteredCount: [0, [Validators.required, Validators.min(0)]]
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadCheckpost(id);
      await this.loadLogs(id);
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
      this.error.set('Failed to load checkpost details.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadLogs(id: string) {
    try {
      const response = await this.checkpostService.getDailyLogs(id);
      this.dailyLogs.set(response.documents);
    } catch (err) {
      console.error('Logs load error', err);
    }
  }

  showLogModal() {
    this.logForm.reset({ vehiclesCheckedCount: 0, casesRegisteredCount: 0 });
    this.isLogModalVisible.set(true);
  }

  async saveLog() {
    if (this.logForm.invalid) return;

    this.isSavingLog.set(true);
    try {
      const cp = this.checkpost();
      if (!cp) return;

      const logData = {
        checkpostId: cp.$id,
        logDate: new Date().toISOString(),
        vehiclesCheckedCount: this.logForm.value.vehiclesCheckedCount,
        casesRegisteredCount: this.logForm.value.casesRegisteredCount
      };

      const logResponse = await this.checkpostService.createDailyLog(logData);

      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Daily log saved' });
      this.isLogModalVisible.set(false);
      await this.loadLogs(cp.$id);
    } catch (err) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save log' });
    } finally {
      this.isSavingLog.set(false);
    }
  }
}
