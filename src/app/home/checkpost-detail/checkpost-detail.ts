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
import { formatDateForIstInput } from '../../utils/date-helpers';

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
  readonly isEditModalVisible = signal(false);
  readonly isSavingEdit = signal(false);

  editForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    circle: ['', Validators.required],
    division: ['', Validators.required],
    range: ['', Validators.required],
    phoneNumber: ['', Validators.required],
    address: ['', Validators.required],
    othersDetails: ['']
  });

  logForm: FormGroup = this.fb.group({
    vehiclesCheckedCount: [0, [Validators.required, Validators.min(0)]],
    vehiclesPassedCount: [0, [Validators.required, Validators.min(0)]],
    logDate: [this.formatDateForInput(this.today), Validators.required]
  });

  private readonly istDateFormatter = new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'long',
    timeZone: 'Asia/Kolkata'
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
    const todayValue = this.formatDateForInput(this.today);
    this.logForm.reset({ vehiclesCheckedCount: 0, vehiclesPassedCount: 0, logDate: todayValue });
    this.isLogModalVisible.set(true);
  }

  async saveLog() {
    if (this.logForm.invalid) return;

    this.isSavingLog.set(true);
    try {
      const cp = this.checkpost();
      if (!cp) return;

      const selectedDate = this.logForm.value.logDate;
      if (this.hasLogForDate(selectedDate)) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Duplicate',
          detail: `A log already exists for ${this.getSelectedDateDisplay()} IST.`
        });
        this.isSavingLog.set(false);
        return;
      }

      const logDateIso = this.toIstIsoDate(selectedDate);
      if (!logDateIso) {
        this.messageService.add({
          severity: 'error',
          summary: 'Invalid date',
          detail: 'Unable to parse the selected date. Please try a different date.'
        });
        this.isSavingLog.set(false);
        return;
      }

      try {
        if (await this.hasServerLogForDate(cp.$id, logDateIso)) {
          this.messageService.add({
            severity: 'warn',
            summary: 'Duplicate',
            detail: `A log already exists for ${this.getSelectedDateDisplay()} IST.`
          });
          this.isSavingLog.set(false);
          return;
        }
      } catch (error) {
        console.error('Error verifying daily log availability:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Verification failed',
          detail: 'Unable to confirm whether a daily entry exists. Please try again.'
        });
        this.isSavingLog.set(false);
        return;
      }

      const logData = {
        checkpostId: cp.$id,
        logDate: logDateIso,
        vehiclesCheckedCount: this.logForm.value.vehiclesCheckedCount,
        vehiclesPassedCount: this.logForm.value.vehiclesPassedCount,
        casesRegisteredCount: 0
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

  showEditDialog() {
    const cp = this.checkpost();
    if (!cp) return;

    this.editForm.setValue({
      name: cp.name,
      circle: cp.circle,
      division: cp.division,
      range: cp.range,
      phoneNumber: cp.phoneNumber,
      address: cp.address,
      othersDetails: cp.othersDetails || ''
    });
    this.isEditModalVisible.set(true);
  }

  async saveDetails() {
    if (this.editForm.invalid) return;
    const cp = this.checkpost();
    if (!cp) return;

    this.isSavingEdit.set(true);
    try {
      const updated = await this.checkpostService.updateCheckpost(cp.$id, this.editForm.value);
      this.checkpost.set({
        ...cp,
        ...updated
      } as unknown as CheckpostWithId);
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Checkpost details saved' });
      this.isEditModalVisible.set(false);
    } catch (error) {
      console.error('Failed to update checkpost:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to save changes at this time' });
    } finally {
      this.isSavingEdit.set(false);
    }
  }

  hasLogForToday() {
    return this.hasLogForDate(new Date());
  }

  isSelectedDateToday() {
    const selected = this.logForm.get('logDate')?.value;
    if (!selected) {
      return false;
    }
    return this.toIstDateKey(selected) === this.toIstDateKey(new Date());
  }

  hasLogForDate(value?: string | Date) {
    const targetKey = this.toIstDateKey(value);
    if (!targetKey) {
      return false;
    }
    return this.dailyLogs().some(log => this.toIstDateKey(log.logDate) === targetKey);
  }

  hasSelectedDateEntry() {
    return this.hasLogForDate(this.logForm.get('logDate')?.value);
  }

  getSelectedDateDisplay() {
    const selected = this.logForm.get('logDate')?.value;
    const istDate = this.toIstDate(selected);
    return istDate ? this.istDateFormatter.format(istDate) : 'the selected date';
  }

  private toIstDateKey(value?: string | Date) {
    const istDate = this.toIstDate(value);
    if (!istDate) {
      return '';
    }
    return istDate.toISOString().split('T')[0];
  }

  private toIstDate(value?: string | Date) {
    if (!value) {
      return null;
    }
    const parsed = typeof value === 'string'
      ? value.includes('T')
        ? new Date(value)
        : new Date(`${value}T00:00:00`)
      : value;
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }
    return new Date(parsed.getTime() + 330 * 60000);
  }

  private toIstIsoDate(value?: string | Date) {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      if (value.includes('T')) {
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) {
          return '';
        }
        const istDate = this.toIstDate(parsed);
        return istDate ? istDate.toISOString() : '';
      }
      const withOffset = new Date(`${value}T00:00:00+05:30`);
      return Number.isNaN(withOffset.getTime()) ? '' : withOffset.toISOString();
    }
    const istDate = this.toIstDate(value);
    return istDate ? istDate.toISOString() : '';
  }

  private async hasServerLogForDate(checkpostId: string, logDateIso: string) {
    const response = await this.checkpostService.getDailyLogsForDate(checkpostId, logDateIso, 1);
    return Array.isArray(response.documents) && response.documents.length > 0;
  }

  private formatDateForInput(date: Date) {
    return formatDateForIstInput(date);
  }
}
