import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

declare var $: any;
declare var WOW: any;

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterModule],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent implements OnInit, AfterViewInit {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    setTimeout(() => {
      const spinner = document.getElementById('spinner');
      if (spinner) {
        spinner.classList.remove('show');
      }
    }, 1);
  }

  ngAfterViewInit() {
    if (typeof WOW !== 'undefined') {
      new WOW().init();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
