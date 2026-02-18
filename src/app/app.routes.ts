import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { HomePage } from './home/home';
import { AddCheckpostComponent } from './add-checkpost/add-checkpost';
import { DashboardComponent } from './home/dashboard/dashboard';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginPage
	},
  {
    path: 'home',
    component: HomePage,
    children: [
      {
        path: '',
        component: DashboardComponent
      },
      {
        path: 'add',
        component: AddCheckpostComponent
      }
    ]
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
