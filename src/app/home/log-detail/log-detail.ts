import { ChangeDetectionStrategy, Component, OnInit, signal, inject } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { CheckpostService, SeizedItemData } from '../../services/checkpost.service';

interface SeizedItemEntry {
  itemId: string;
  quantity: number;
  value: number;
  weight?: number | null;
  customLabel?: string | null;
}

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
  seizedItemOptions = signal<SeizedItemData[]>([]);

  logEditForm: FormGroup = this.fb.group({
    vehiclesCheckedCount: [0, [Validators.required, Validators.min(0)]],
    vehiclesPassedCount: [0, [Validators.required, Validators.min(0)]]
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
    seizedItems: this.fb.array([]),
    actionTakenName: ['', Validators.required],
    actionTakenPhone: ['', Validators.required],
    actionTakenDesignation: ['', Validators.required],
    caseNumber: ['', Validators.required],
    accusedPersonCount: [0, [Validators.required, Validators.min(0)]]
  });

  get seizedItemsArray(): FormArray {
    return this.caseForm.get('seizedItems') as FormArray;
  }

  get seizedItemControls() {
    return this.seizedItemsArray.controls;
  }

  ngOnInit() {
    this.setupFormSync();
    this.loadSeizedItems();
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
      driverLicense: this.caseForm.get('ownerLicense')?.value
    }, { emitEvent: false });
  }

  private normalizeSeizedItems(value: unknown): SeizedItemEntry[] {
    if (Array.isArray(value)) {
      return value;
    }
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // fall through to empty list
      }
    }
    return [];
  }

  async loadLogData(logId: string) {
    this.isLoading.set(true);
    try {
      const [log, casesResponse] = await Promise.all([
        this.checkpostService.getDailyLog(logId),
        this.checkpostService.getCasesForLog(logId)
      ]);
      this.dailyLog.set(log);
      const parsedCases = casesResponse.documents.map(caseDoc => ({
        ...caseDoc,
        seizedItems: this.normalizeSeizedItems(caseDoc['seizedItems'])
      }));
      this.cases.set(parsedCases);
    } catch (error) {
      console.error('Error loading log data:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load log details' });
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadSeizedItems() {
    try {
      const response = await this.checkpostService.getSeizedItems(200);
      const documents = response.documents as Array<{ $id: string; name?: string; description?: string }>;
      const formatted = documents.map(doc => ({
        $id: doc.$id,
        name: doc.name ?? 'Unnamed Item',
        description: doc.description
      }));
      this.seizedItemOptions.set(formatted);
    } catch (error) {
      console.error('Error loading seized items:', error);
    }
  }

  showCaseModal() {
    this.editingCaseId.set(null);
    this.caseForm.reset({ ownerIsDriver: false });
    this.caseForm.get('driverName')?.enable();
    this.caseForm.get('driverNumber')?.enable();
    this.caseForm.get('driverLicense')?.enable();
    this.clearSeizedItems();
    this.addSeizedItemEntry();
    this.isCaseModalVisible.set(true);
  }

  editCase(caseItem: any) {
    this.editingCaseId.set(caseItem.$id);

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

    this.clearSeizedItems();
    const seizedItems: SeizedItemEntry[] = this.normalizeSeizedItems(caseItem.seizedItems);
    if (seizedItems.length) {
      seizedItems.forEach(item => this.addSeizedItemEntry(item));
    } else {
      this.addSeizedItemEntry();
    }

    this.isCaseModalVisible.set(true);
  }

  addSeizedItemEntry(entry?: Partial<SeizedItemEntry>) {
    this.seizedItemsArray.push(this.fb.group({
      itemId: [entry?.itemId || '', Validators.required],
      quantity: [entry?.quantity ?? 1, [Validators.required, Validators.min(1)]],
      weight: [entry?.weight ?? null],
      value: [entry?.value ?? 0, [Validators.required, Validators.min(0)]],
      customLabel: [entry?.customLabel || '']
    }));
  }

  removeSeizedItemEntry(index: number) {
    this.seizedItemsArray.removeAt(index);
  }

  clearSeizedItems() {
    while (this.seizedItemsArray.length) {
      this.seizedItemsArray.removeAt(0);
    }
  }

  async saveCase() {
    if (this.caseForm.invalid) return;

    this.isSavingCase.set(true);
    try {
      const logId = this.logId();
      if (!logId) return;

      const { ownerIsDriver, ...rest } = this.caseForm.getRawValue();
      const seizedItems = this.seizedItemsArray.value
        .map((entry: SeizedItemEntry) => {
          const structured: SeizedItemEntry = {
            itemId: entry.itemId,
            quantity: entry.quantity,
            value: entry.value
          };
          if (entry.weight !== null && entry.weight !== undefined) {
            structured.weight = Number(entry.weight);
          }
          if (entry.itemId === 'others' && entry.customLabel?.trim()) {
            structured.customLabel = entry.customLabel.trim();
          }
          return structured;
        })
        .filter((entry: SeizedItemEntry) => entry.itemId);
      const totalWeight = seizedItems.reduce((sum: number, item: SeizedItemEntry) => sum + (item.weight ?? 0), 0);

      const caseData = {
        ...rest,
        seizedItems: JSON.stringify(seizedItems),
        seizedItemsWeight: totalWeight,
        logId
      };

        if (this.editingCaseId()) {
          await this.checkpostService.updateCase(this.editingCaseId()!, caseData);
          this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Case record updated' });
        } else {
          await this.checkpostService.createCase(caseData);
          const currentLog = this.dailyLog();
          if (currentLog) {
            const nextCount = (currentLog.casesRegisteredCount ?? 0) + 1;
            const updatedLog = await this.checkpostService.updateDailyLog(logId, {
              casesRegisteredCount: nextCount
            });
            this.dailyLog.set(updatedLog);
          }
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Case registered successfully' });
        }

      this.isCaseModalVisible.set(false);
      const casesResponse = await this.checkpostService.getCasesForLog(logId);
        const parsedCases = casesResponse.documents.map(caseDoc => ({
          ...caseDoc,
          seizedItems: this.normalizeSeizedItems(caseDoc['seizedItems'])
        }));
      this.cases.set(parsedCases);
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
        vehiclesPassedCount: log.vehiclesPassedCount ?? 0
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
