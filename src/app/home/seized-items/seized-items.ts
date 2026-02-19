import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
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
    DialogModule,
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
  isEditing = signal(false);
  deletingItemId = signal<string | null>(null);
  editDialogVisible = signal(false);

  form: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  editForm: FormGroup = this.fb.group({
    name: ['', Validators.required],
    description: ['']
  });

  private activeEditId: string | null = null;

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

  startEdit(item: SeizedItemData) {
    this.activeEditId = item.$id;
    this.editForm.setValue({
      name: item.name,
      description: item.description ?? ''
    });
    this.editDialogVisible.set(true);
  }

  async saveEdit() {
    if (this.editForm.invalid || !this.activeEditId) {
      return;
    }

    this.isEditing.set(true);
    try {
      const payload = this.editForm.value;
      const updated = await this.service.updateSeizedItem(this.activeEditId, payload);
      const doc = updated as { name?: string; description?: string };
      this.items.update(current =>
        current.map(item =>
          item.$id === this.activeEditId
            ? {
                ...item,
                name: doc.name ?? payload.name,
                description: doc.description ?? payload.description
              }
            : item
        )
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Seized item saved'
      });
      this.hideEditDialog();
    } catch (error) {
      console.error('Failed to save seized item', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Save failed',
        detail: 'Unable to update item at this time.'
      });
    } finally {
      this.isEditing.set(false);
    }
  }

  async deleteItem(item: SeizedItemData) {
    if (!confirm(`Remove seized item "${item.name}"?`)) {
      return;
    }

    this.deletingItemId.set(item.$id);
    try {
      await this.service.deleteSeizedItem(item.$id);
      this.items.update(current => current.filter(entry => entry.$id !== item.$id));
      this.messageService.add({
        severity: 'success',
        summary: 'Removed',
        detail: 'Seized item deleted'
      });
    } catch (error) {
      console.error('Failed to delete seized item', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Delete failed',
        detail: 'Unable to remove item at this time.'
      });
    } finally {
      this.deletingItemId.set(null);
    }
  }

  hideEditDialog() {
    this.editDialogVisible.set(false);
  }

  handleEditDialogHide() {
    this.activeEditId = null;
    this.editForm.reset();
    this.isEditing.set(false);
  }
}
