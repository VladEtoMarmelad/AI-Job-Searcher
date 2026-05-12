import { Injectable } from '@nestjs/common';
import { Vacancy } from '@sharedTypes/Vacancy';

interface BrowsingState {
  vacancies: Vacancy[];
  currentIndex: number;
}

interface SearchInputState {
  step: 'awaiting_keyword' | 'awaiting_resume' | 'awaiting_filters';
  searchKeyword?: string;
  resume?: string;
}

@Injectable()
export class BrowsingStateService {
  private userBrowsingState = new Map<number, BrowsingState>();
  private userFavoritesBrowsingState = new Map<number, BrowsingState>();
  private userSearchInputState = new Map<number, SearchInputState>();

  // Initialize browsing state for a user
  initializeBrowsingState(userId: number, vacancies: Vacancy[]): void {
    this.userBrowsingState.set(userId, {
      vacancies,
      currentIndex: 0,
    });
  }

  // Get browsing state for a user
  getBrowsingState(userId: number): BrowsingState | undefined {
    return this.userBrowsingState.get(userId);
  }

  // Clear browsing state for a user
  clearBrowsingState(userId: number): void {
    this.userBrowsingState.delete(userId);
  }

  // Initialize favorites browsing state for a user
  initializeFavoritesBrowsingState(userId: number, vacancies: Vacancy[]): void {
    this.userFavoritesBrowsingState.set(userId, {
      vacancies,
      currentIndex: 0,
    });
  }

  // Get favorites browsing state for a user
  getFavoritesBrowsingState(userId: number): BrowsingState | undefined {
    return this.userFavoritesBrowsingState.get(userId);
  }

  // Remove current favorite from the list and adjust index
  removeFavoriteAtIndex(userId: number, index: number): void {
    const state = this.userFavoritesBrowsingState.get(userId);
    if (state) {
      state.vacancies.splice(index, 1);
    }
  }

  // Clear favorites browsing state for a user
  clearFavoritesBrowsingState(userId: number): void {
    this.userFavoritesBrowsingState.delete(userId);
  }

  // Initialize search input state for a user
  initializeSearchInputState(userId: number): void {
    this.userSearchInputState.set(userId, {
      step: 'awaiting_keyword',
    });
  }

  // Get search input state for a user
  getSearchInputState(userId: number): SearchInputState | undefined {
    return this.userSearchInputState.get(userId);
  }

  // Clear search input state for a user
  clearSearchInputState(userId: number): void {
    this.userSearchInputState.delete(userId);
  }
}
