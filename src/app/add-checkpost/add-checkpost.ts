import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CheckpostService } from '../services/checkpost.service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-add-checkpost',
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    InputTextModule, 
    TextareaModule, 
    ButtonModule, 
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './add-checkpost.html',
  styleUrls: ['./add-checkpost.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddCheckpostComponent {
  private readonly fb = inject(FormBuilder);
  private readonly checkpostService = inject(CheckpostService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  readonly isLoading = signal(false);

  readonly checkpostForm: FormGroup = this.fb.group({
    name: ['', [Validators.required]],
    circle: ['', [Validators.required]],
    division: ['', [Validators.required]],
    range: ['', [Validators.required]],
    address: ['', [Validators.required]],
    phoneNumber: ['', [Validators.required]],
    latitude: [null, [Validators.required]],
    longitude: [null, [Validators.required]],
    othersDetails: ['']
  });

  async onSubmit() {
    if (this.checkpostForm.invalid) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Please fill all required fields correctly.' 
      });
      return;
    }

    this.isLoading.set(true);
    try {
      await this.checkpostService.createCheckpost(this.checkpostForm.value);
      this.messageService.add({ 
        severity: 'success', 
        summary: 'Success', 
        detail: 'Checkpost added successfully' 
      });
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 1500);
    } catch (error) {
      this.messageService.add({ 
        severity: 'error', 
        summary: 'Error', 
        detail: 'Failed to add checkpost. Please check your connection or permissions.' 
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
