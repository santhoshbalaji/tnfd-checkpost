import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { CommonModule } from '@angular/common';
import { CheckpostService, SeizedItemData } from '../../services/checkpost.service';

@Component({
  selector: 'app-seized-items',
  templateUrl: './seized-items.html',
  styleUrls: ['./seized-items.css'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    TableModule,
    ToastModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeizedItemsPage implements OnInit {
  private readonly service = inject(CheckpostService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);

  items = signal<SeizedItemData[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  ngOnInit() {
    this.loadItems();
  }

  async loadItems() {
    this.isLoading.set(true);
    try {
      const response = await this.service.getSeizedItems(200);
      const documents = response.documents as Array<{ $id: string; name?: string; description?: string }>;
      this.items.set(documents.map(doc => ({
        $id: doc.$id,
        name: doc.name ?? 'Unnamed Item',
        description: doc.description
      })));
    } catch (error) {
      console.error('Failed to load seized items', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Unable to load',
        detail: 'Could not fetch seized item master data.'
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async submit() {
    if (this.form.invalid) return;

    this.isSaving.set(true);
    try {
      const payload = this.form.value;
      const created = await this.service.createSeizedItem(payload);
      const createdItem = {
        $id: created.$id,
        name: (created as { name?: string }).name ?? payload.name,
        description: (created as { description?: string }).description ?? payload.description
      };
      this.items.update(current => [...current, createdItem]);
      this.form.reset();
      this.messageService.add({ severity: 'success', summary: 'Saved', detail: 'Seized item added' });
    } catch (error) {
      console.error('Failed to create seized item', error);
      this.messageService.add({ severity: 'error', summary: 'Save failed', detail: 'Unable to add item at this time.' });
    } finally {
      this.isSaving.set(false);
    }
  }
}
