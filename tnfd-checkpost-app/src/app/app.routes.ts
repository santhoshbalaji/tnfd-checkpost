import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';

export const routes: Routes = [
	{
		path: '',
		component: LoginPage
	},
	{
		path: '**',
		redirectTo: '',
		pathMatch: 'full'
	}
];
