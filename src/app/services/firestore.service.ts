import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  CollectionReference,
  DocumentData
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  constructor(private firestore: Firestore) {}

  // Get a collection reference
  getCollection(collectionName: string): CollectionReference<DocumentData> {
    return collection(this.firestore, collectionName);
  }

  // Add a document to a collection
  async addDocument(collectionName: string, data: any) {
    try {
      const collectionRef = this.getCollection(collectionName);
      const docRef = await addDoc(collectionRef, data);
      return docRef.id;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  // Get a single document by ID
  async getDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  // Get all documents from a collection
  async getAllDocuments(collectionName: string) {
    try {
      const collectionRef = this.getCollection(collectionName);
      const querySnapshot = await getDocs(collectionRef);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  // Update a document
  async updateDocument(collectionName: string, docId: string, data: any) {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await updateDoc(docRef, data);
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  }

  // Delete a document
  async deleteDocument(collectionName: string, docId: string) {
    try {
      const docRef = doc(this.firestore, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  // Add multiple documents to a collection (batch upload)
  async addMultipleDocuments(collectionName: string, dataArray: any[]) {
    try {
      const results = [];
      for (const data of dataArray) {
        const docId = await this.addDocument(collectionName, data);
        results.push(docId);
      }
      return results;
    } catch (error) {
      console.error('Error adding multiple documents:', error);
      throw error;
    }
  }

  // Get due schedules from Firestore
  async getDueSchedules() {
    try {
      return await this.getAllDocuments('dueSchedules');
    } catch (error) {
      console.error('Error fetching due schedules:', error);
      throw error;
    }
  }

  // Query documents
  async queryDocuments(collectionName: string, field: string, operator: any, value: any) {
    try {
      const collectionRef = this.getCollection(collectionName);
      const q = query(collectionRef, where(field, operator, value));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error querying documents:', error);
      throw error;
    }
  }
}
