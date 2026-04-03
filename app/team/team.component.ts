import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';

declare var WOW: any;

@Component({
  selector: 'app-team',
  imports: [CommonModule, RouterModule],
  templateUrl: './team.component.html',
  styleUrl: './team.component.css'
})
export class TeamComponent implements OnInit, AfterViewInit {
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
