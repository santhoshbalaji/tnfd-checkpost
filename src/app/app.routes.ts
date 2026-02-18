import { Routes } from '@angular/router';
import { LoginPage } from './login/login.page';
import { HomePage } from './home/home';
import { AddCheckpostComponent } from './add-checkpost/add-checkpost';
import { DashboardComponent } from './home/dashboard/dashboard';
import { CheckpostsPage } from './home/checkposts/checkposts';
import { CheckpostDetailComponent } from './home/checkpost-detail/checkpost-detail';
import { LogDetailComponent } from './home/log-detail/log-detail';
import { SeizedItemsPage } from './home/seized-items/seized-items';

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
        path: 'checkposts',
        component: CheckpostsPage
      },
      {
        path: 'seized-items',
        component: SeizedItemsPage
      },
      {
        path: 'add',
        component: AddCheckpostComponent
      },
      {
        path: 'detail/:id',
        component: CheckpostDetailComponent
      },
      {
        path: 'detail/:id/log/:logId',
        component: LogDetailComponent
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
