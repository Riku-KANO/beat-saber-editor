import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface BeatSaberProject {
  id: string
  name: string
  artist: string
  bpm: number
  duration: number
  createdAt: Date
  lastModified: Date
  audioFileName?: string
  objectCount: number
}

interface ProjectStore {
  projects: BeatSaberProject[]
  currentProject: BeatSaberProject | null
  
  // Actions
  createProject: (name: string, artist: string, bpm: number) => string
  deleteProject: (id: string) => void
  loadProject: (id: string) => void
  updateCurrentProject: (updates: Partial<BeatSaberProject>) => void
  getCurrentProjectData: () => BeatSaberProject | null
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProject: null,

      createProject: (name: string, artist: string, bpm: number) => {
        const id = Date.now().toString()
        const newProject: BeatSaberProject = {
          id,
          name,
          artist,
          bpm,
          duration: 0,
          createdAt: new Date(),
          lastModified: new Date(),
          objectCount: 0
        }
        
        set((state) => ({
          projects: [...state.projects, newProject],
          currentProject: newProject
        }))
        
        return id
      },

      deleteProject: (id: string) => {
        set((state) => ({
          projects: state.projects.filter(p => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject
        }))
      },

      loadProject: (id: string) => {
        const project = get().projects.find(p => p.id === id)
        if (project) {
          set({ currentProject: project })
        }
      },

      updateCurrentProject: (updates: Partial<BeatSaberProject>) => {
        set((state) => {
          if (!state.currentProject) return state
          
          const updatedProject = {
            ...state.currentProject,
            ...updates,
            lastModified: new Date()
          }
          
          return {
            currentProject: updatedProject,
            projects: state.projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            )
          }
        })
      },

      getCurrentProjectData: () => {
        return get().currentProject
      }
    }),
    {
      name: 'beat-saber-projects'
    }
  )
)