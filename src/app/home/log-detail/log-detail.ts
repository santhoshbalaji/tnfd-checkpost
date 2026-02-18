import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CheckpostService } from '../../services/checkpost.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-log-detail',
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
  templateUrl: './log-detail.html',
  styleUrls: ['./log-detail.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly checkpostService = inject(CheckpostService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  checkpostId = signal<string | null>(null);
  logId = signal<string | null>(null);
  dailyLog = signal<any>(null);
  cases = signal<any[]>([]);
  isLoading = signal(true);
  isSavingCase = signal(false);
  isCaseModalVisible = signal(false);
  isLogEditModalVisible = signal(false);
  isUpdatingLog = signal(false);
  editingCaseId = signal<string | null>(null);

  logEditForm: FormGroup = this.fb.group({
    vehiclesCheckedCount: [0, [Validators.required, Validators.min(0)]],
    casesRegisteredCount: [0, [Validators.required, Validators.min(0)]]
  });

  caseForm: FormGroup = this.fb.group({
    vehicleRegNumber: ['', Validators.required],
    engineNumber: ['', Validators.required],
    ownerIsDriver: [false],
    ownerName: ['', Validators.required],
    ownerNumber: ['', Validators.required],
    ownerLicense: ['', Validators.required],
    driverName: ['', Validators.required],
    driverNumber: ['', Validators.required],
    driverLicense: ['', Validators.required],
    
    // Seized Items
    seizedMoney: [false],
    moneyAmount: [0],
    seizedForestOffence: [false],
    forestOffenceDetails: [''],
    seizedPoliceOffence: [false],
    policeOffenceDetails: [''],
    seizedOtherOffence: [false],
    otherOffenceDetails: [''],
    
    // Action Taken & Case Details
    actionTakenName: ['', Validators.required],
    actionTakenPhone: ['', Validators.required],
    caseNumber: ['', Validators.required]
  });

  setupFormSync() {
    this.caseForm.get('ownerIsDriver')?.valueChanges.subscribe(isSame => {
      if (isSame) {
        this.syncOwnerToDriver();
        this.caseForm.get('driverName')?.disable();
        this.caseForm.get('driverNumber')?.disable();
        this.caseForm.get('driverLicense')?.disable();
      } else {
        this.caseForm.get('driverName')?.enable();
        this.caseForm.get('driverNumber')?.enable();
        this.caseForm.get('driverLicense')?.enable();
      }
    });

    // Listen to conditional seized item fields
    this.caseForm.get('seizedMoney')?.valueChanges.subscribe(checked => {
      const ctrl = this.caseForm.get('moneyAmount');
      if (checked) ctrl?.setValidators([Validators.required, Validators.min(1)]);
      else ctrl?.clearValidators();
      ctrl?.updateValueAndValidity();
    });

    ['seizedForestOffence', 'seizedPoliceOffence', 'seizedOtherOffence'].forEach(type => {
      const detailsField = type.replace('seized', '').charAt(0).toLowerCase() + type.replace('seized', '').slice(1) + 'Details';
      this.caseForm.get(type)?.valueChanges.subscribe(checked => {
        const ctrl = this.caseForm.get(detailsField);
        if (checked) ctrl?.setValidators([Validators.required]);
        else ctrl?.clearValidators();
        ctrl?.updateValueAndValidity();
      });
    });

    // Listen to owner field changes to sync in real-time if checkbox is checked
    ['ownerName', 'ownerNumber', 'ownerLicense'].forEach(field => {
      this.caseForm.get(field)?.valueChanges.subscribe(() => {
        if (this.caseForm.get('ownerIsDriver')?.value) {
          this.syncOwnerToDriver();
        }
      });
    });
  }

  syncOwnerToDriver() {
    this.caseForm.patchValue({
      driverName: this.caseForm.get('ownerName')?.value,
      driverNumber: this.caseForm.get('ownerNumber')?.value,
      driverLicense: this.caseForm.get('ownerLicense')?.value,
    }, { emitEvent: false });
  }

  ngOnInit() {
    this.setupFormSync();
    this.route.paramMap.subscribe(params => {
      const cpId = params.get('id');
      const lId = params.get('logId');
      this.checkpostId.set(cpId);
      this.logId.set(lId);

      if (lId) {
        this.loadLogData(lId);
      }
    });
  }

  async loadLogData(logId: string) {
    this.isLoading.set(true);
    try {
      const [log, casesResponse] = await Promise.all([
        this.checkpostService.getDailyLog(logId),
        this.checkpostService.getCasesForLog(logId)
      ]);
      this.dailyLog.set(log);
      this.cases.set(casesResponse.documents);
    } catch (error) {
      console.error('Error loading log data:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load log details' });
    } finally {
      this.isLoading.set(false);
    }
  }

  showCaseModal() {
    this.editingCaseId.set(null);
    this.caseForm.reset({ ownerIsDriver: false });
    this.caseForm.get('driverName')?.enable();
    this.caseForm.get('driverNumber')?.enable();
    this.caseForm.get('driverLicense')?.enable();
    this.isCaseModalVisible.set(true);
  }

  editCase(caseItem: any) {
    this.editingCaseId.set(caseItem.$id);
    
    // Check if owner is driver by comparing fields
    const isOwnerDriver = caseItem.ownerName === caseItem.driverName && 
                         caseItem.ownerNumber === caseItem.driverNumber &&
                         caseItem.ownerLicense === caseItem.driverLicense;

    this.caseForm.patchValue({
      ...caseItem,
      ownerIsDriver: isOwnerDriver
    });

    if (isOwnerDriver) {
      this.caseForm.get('driverName')?.disable();
      this.caseForm.get('driverNumber')?.disable();
      this.caseForm.get('driverLicense')?.disable();
    } else {
      this.caseForm.get('driverName')?.enable();
      this.caseForm.get('driverNumber')?.enable();
      this.caseForm.get('driverLicense')?.enable();
    }

    this.isCaseModalVisible.set(true);
  }

  async saveCase() {
    if (this.caseForm.invalid) return;

    this.isSavingCase.set(true);
    try {
      const logId = this.logId();
      if (!logId) return;

      const { ownerIsDriver, ...rest } = this.caseForm.getRawValue();
      const caseData = {
        ...rest,
        logId: logId
      };

      if (this.editingCaseId()) {
        await this.checkpostService.updateCase(this.editingCaseId()!, caseData);
        this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Case record updated' });
      } else {
        await this.checkpostService.createCase(caseData);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Case registered successfully' });
      }

      this.isCaseModalVisible.set(false);
      
      // Refresh cases list
      const casesResponse = await this.checkpostService.getCasesForLog(logId);
      this.cases.set(casesResponse.documents);
    } catch (error) {
      console.error('Error saving case:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save case' });
    } finally {
      this.isSavingCase.set(false);
    }
  }

  openEditLogModal() {
    const log = this.dailyLog();
    if (log) {
      this.logEditForm.patchValue({
        vehiclesCheckedCount: log.vehiclesCheckedCount,
        casesRegisteredCount: log.casesRegisteredCount
      });
      this.isLogEditModalVisible.set(true);
    }
  }

  async saveLogEdit() {
    if (this.logEditForm.invalid) return;

    this.isUpdatingLog.set(true);
    try {
      const logId = this.logId();
      if (!logId) return;

      const data = this.logEditForm.value;
      const updatedLog = await this.checkpostService.updateDailyLog(logId, data);
      
      this.dailyLog.set(updatedLog);
      this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Shift counts updated' });
      this.isLogEditModalVisible.set(false);
    } catch (error) {
      console.error('Error updating log:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update shift counts' });
    } finally {
      this.isUpdatingLog.set(false);
    }
  }
}
