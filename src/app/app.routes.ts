import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { HomePage } from './home/home';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginPage
	},
  {
    path: 'home',
    component: HomePage
  },
	{
		path: '',
		redirectTo: 'login',
		pathMatch: 'full'
	},
	{
		path: '**',
		redirectTo: 'login',
		pathMatch: 'full'
	}
];
